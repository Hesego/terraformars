import { Injectable, Logger } from '@nestjs/common';
import { Client } from 'pg';
import { DeploymentsService } from '../deployments/deployments.service';

@Injectable()
export class DatabaseTerminalService {
  private readonly logger = new Logger(DatabaseTerminalService.name);
  private connections: Map<string, Client> = new Map();

  constructor(private deploymentsService: DeploymentsService) {}

  async connect(deploymentId: string, userId: string, databaseName: string = 'postgres'): Promise<string> {
    const deployment = await this.deploymentsService.findOne(deploymentId, userId);
    if (!deployment) throw new Error('Deployment not found');

    const params = deployment.parameters;
    const resource = deployment.resources_inventory?.find(r => 
      r.type === 'azurerm_postgresql_flexible_server' || 
      r.type === 'Microsoft.DBforPostgreSQL/flexibleServers'
    );

    if (!resource) throw new Error('PostgreSQL resource not found in deployment');

    const host = resource.fqdn || resource.name + '.postgres.database.azure.com';
    const user = params.postgresql_admin_username || params.admin_username || 'postgres';
    const password = params.postgresql_admin_password || params.admin_password;

    if (!password) throw new Error('Database password not found in deployment parameters');

    const client = new Client({
      host,
      user,
      password,
      database: databaseName,
      port: 5432,
      ssl: { rejectUnauthorized: false },
    });

    await client.connect();
    this.connections.set(deploymentId + ':' + userId, client);
    
    return `Connected to ${host} as ${user}`;
  }

  async executeQuery(deploymentId: string, userId: string, sql: string): Promise<string> {
    const key = deploymentId + ':' + userId;
    const client = this.connections.get(key);
    if (!client) throw new Error('Not connected to database');

    const trimmedSql = sql.trim().toLowerCase();

    // Support for database switching
    if (trimmedSql.startsWith('\\c ') || trimmedSql.startsWith('use ')) {
      const newDb = sql.trim().split(/\s+/)[1]?.replace(';', '');
      if (!newDb) return 'ERROR: Specify a database name.';
      
      try {
        await this.disconnect(deploymentId, userId);
        const result = await this.connect(deploymentId, userId, newDb);
        return `\n${result}\nSwitched to database: ${newDb}\n`;
      } catch (err) {
        return `ERROR switching to ${newDb}: ${err.message}`;
      }
    }

    // Basic help
    if (trimmedSql === 'help' || trimmedSql === '?') {
      return `
Available commands:
  \\c <db> or USE <db>  - Switch to another database
  \\dt                  - List all tables in public schema
  \\l                   - List all databases
  SELECT ...           - Standard SQL queries
  INSERT/UPDATE/DELETE - Data manipulation
  history              - (Frontend) View previous commands
  logout               - Close connection
`;
    }

    // psql Aliases
    let finalSql = sql;
    if (trimmedSql === '\\dt') {
        finalSql = "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public';";
    } else if (trimmedSql === '\\l') {
        finalSql = "SELECT datname FROM pg_database;";
    } else if (trimmedSql.startsWith('\\d ')) {
        const tableName = sql.trim().split(/\s+/)[1];
        finalSql = `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${tableName}';`;
    }

    try {
      const result = await client.query(finalSql);
      
      if (Array.isArray(result)) {
         return result.map(r => this.formatResult(r)).join('\n\n');
      }
      
      return this.formatResult(result);
    } catch (error) {
      return `ERROR: ${error.message}`;
    }
  }

  private formatResult(result: any): string {
    if (result.command === 'SELECT') {
      if (result.rows.length === 0) return '0 rows returned';
      
      const columns = Object.keys(result.rows[0]);
      const header = columns.join(' | ');
      const separator = columns.map(c => '-'.repeat(c.length)).join('-+-');
      const rows = result.rows.map((row: any) => 
        columns.map(c => String(row[c])).join(' | ')
      );
      
      return `${header}\n${separator}\n${rows.join('\n')}\n(${result.rows.length} rows)`;
    }
    
    return `${result.command} ${result.rowCount || ''}`.trim();
  }

  async disconnect(deploymentId: string, userId: string) {
    const key = deploymentId + ':' + userId;
    const client = this.connections.get(key);
    if (client) {
      await client.end();
      this.connections.delete(key);
    }
  }
}
