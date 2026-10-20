import axios from 'axios';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    withCredentials: true,
});

export const TemplateAppService = {
    generate: async (description: string, name?: string) => {
        const res = await api.post('/templates/generate', { description, name });
        return res.data;
    },
    reestimateCost: async (terraform_code: string) => {
        const res = await api.post('/templates/reestimate-cost', { terraform_code });
        return res.data;
    },
    save: async (template: any) => {
        const res = await api.post('/templates', template);
        return res.data;
    },
    list: async () => {
        const res = await api.get('/templates');
        return res.data;
    },
    getOne: async (id: string) => {
        const res = await api.get(`/templates/${id}`);
        return res.data;
    },
    update: async (id: string, data: any) => {
        const res = await api.patch(`/templates/${id}`, data);
        return res.data;
    },
    refine: async (id: string, prompt: string) => {
        const res = await api.post(`/templates/${id}/refine`, { prompt });
        return res.data;
    },
    delete: async (id: string) => {
        const res = await api.delete(`/templates/${id}`);
        return res.data;
    },
};

export const DeploymentAppService = {
    create: async (data: any) => {
        const res = await api.post('/deployments', data);
        return res.data;
    },
    getStats: async () => {
        const res = await api.get('/deployments/stats');
        return res.data;
    },
    list: async () => {
        const res = await api.get('/deployments');
        return res.data;
    },
    getOne: async (id: string) => {
        const res = await api.get(`/deployments/${id}`);
        return res.data;
    },
    delete: async (id: string) => {
        const res = await api.delete(`/deployments/${id}`);
        return res.data;
    },
    deleteAll: async () => {
        const res = await api.delete('/deployments');
        return res.data;
    },
    executeScript: async (id: string, resourceId: string, scriptId: string) => {
        const res = await api.post(`/deployments/${id}/execute-script`, { resourceId, scriptId });
        return res.data;
    },
    getScriptExecution: async (executionId: string) => {
        const res = await api.get(`/deployments/script-executions/${executionId}`);
        return res.data;
    },
    stopScriptExecution: async (executionId: string) => {
        const res = await api.post(`/deployments/script-executions/${executionId}/stop`);
        return res.data;
    }
};

export const TenantAppService = {
    list: async () => {
        const res = await api.get('/tenants');
        return res.data;
    },
    getOne: async (id: string) => {
        const res = await api.get(`/tenants/${id}`);
        return res.data;
    },
    create: async (data: any) => {
        const res = await api.post('/tenants', data);
        return res.data;
    },
    delete: async (id: string) => {
        const res = await api.delete(`/tenants/${id}`);
        return res.data;
    },
    verify: async (id: string) => {
        const res = await api.post(`/tenants/${id}/verify`);
        return res.data;
    }
};

export const ScriptAppService = {
    list: async () => {
        const res = await api.get('/scripts');
        return res.data;
    },
    create: async (data: any) => {
        const res = await api.post('/scripts', data);
        return res.data;
    },
    update: async (id: string, data: any) => {
        const res = await api.patch(`/scripts/${id}`, data);
        return res.data;
    },
    delete: async (id: string) => {
        const res = await api.delete(`/scripts/${id}`);
        return res.data;
    },
    generate: async (prompt: string, language: string) => {
        const res = await api.post('/scripts/generate', { prompt, language });
        return res.data;
    },
    refine: async (id: string, prompt: string) => {
        const res = await api.post(`/scripts/${id}/refine`, { prompt });
        return res.data;
    }
};

export const AdminAppService = {
    getAllResources: async (tenantId: string) => {
        const res = await api.get(`/admin/resources/${tenantId}`);
        return res.data;
    },
    listVMs: async (tenantId: string) => {
        const res = await api.get(`/admin/vms/${tenantId}`);
        return res.data;
    },
    listAKS: async (tenantId: string) => {
        const res = await api.get(`/admin/aks/${tenantId}`);
        return res.data;
    },
    listAppServices: async (tenantId: string) => {
        const res = await api.get(`/admin/app-services/${tenantId}`);
        return res.data;
    },
    listVNets: async (tenantId: string) => {
        const res = await api.get(`/admin/vnets/${tenantId}`);
        return res.data;
    },
    listDatabases: async (tenantId: string) => {
        const res = await api.get(`/admin/databases/${tenantId}`);
        return res.data;
    },
    connectVNets: async (tenantId: string, data: { vnet1: { name: string; resourceGroup: string }; vnet2: { id: string; name: string } }) => {
        const res = await api.post(`/admin/vnets/${tenantId}/connect`, data);
        return res.data;
    },
    disconnectVNet: async (tenantId: string, data: { resourceGroup: string; vnetName: string; peeringName: string }) => {
        const res = await api.delete(`/admin/vnets/${tenantId}/disconnect`, { data });
        return res.data;
    },
    executeScript: async (tenantId: string, data: { resourceId: string; resourceName: string; resourceGroup: string; scriptId: string; osType: 'Linux' | 'Windows' }) => {
        const res = await api.post(`/admin/execute-script/${tenantId}`, data);
        return res.data;
    },
};

export const K8sAppService = {
    getPods: async (tenantId: string, resourceGroup: string, clusterName: string, namespace = 'default') => {
        const res = await api.get(`/k8s/${tenantId}/${resourceGroup}/${clusterName}/pods`, { params: { namespace } });
        return res.data;
    },
    getNodes: async (tenantId: string, resourceGroup: string, clusterName: string) => {
        const res = await api.get(`/k8s/${tenantId}/${resourceGroup}/${clusterName}/nodes`);
        return res.data;
    },
    getServices: async (tenantId: string, resourceGroup: string, clusterName: string, namespace = 'default') => {
        const res = await api.get(`/k8s/${tenantId}/${resourceGroup}/${clusterName}/services`, { params: { namespace } });
        return res.data;
    },
};

export const AppServiceAppService = {
    executeCommand: async (tenantId: string, resourceGroup: string, name: string, command: string, dir?: string) => {
        const res = await api.post(`/appservice/${tenantId}/${resourceGroup}/${name}/command`, { command, dir });
        return res.data;
    },
    getLogs: async (tenantId: string, resourceGroup: string, name: string) => {
        const res = await api.get(`/appservice/${tenantId}/${resourceGroup}/${name}/logs`);
        return res.data;
    },
};


export default api;
