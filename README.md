# TerraAI Builder 🚀

A modern SaaS platform that combines AI (OpenAI GPT-4o) with Terraform to automate Azure resource deployments.

## ✨ Features

- **AI Template Generation**: Describe your infrastructure in natural language, get valid Terraform code.
- **Variable Detection**: Automatically extracts required parameters from generated HCL.
- **Direct Azure Deployment**: Integrated Terraform CLI execution for immediate resource creation.
- **Tenant Management**: Securely store and use multiple Azure Service Principal credentials (encrypted).
- **Template Library**: Save, version, and reuse your infrastructure designs.
- **Async Execution**: Deployment tasks are handled via Redis queue (BullMQ) for reliability.

## 🏗️ Tech Stack

### Backend
- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: PostgreSQL (TypeORM)
- **Task Queue**: Redis + BullMQ
- **AI**: OpenAI SDK
- **DevOps**: Terraform CLI child_process wrapper

### Frontend
- **Framework**: Next.js (App Router)
- **UI Library**: Mantine UI + Tabler Icons
- **State Management**: React Hooks + Form
- **Styling**: Vanilla CSS + Mantine Dark Mode

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- Docker & Docker Compose
- Terraform CLI installed (in the environment where backend runs)
- OpenAI API Key
- Azure Subscription + Service Principal

### Installation

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd terraformars
   ```

2. **Setup environment variables**
   Copy `.env.example` to `.env` in both folders (or use the root one if configured).
   ```bash
   # Root .env
   OPENAI_API_KEY=your_key_here
   ENCRYPTION_KEY=32_char_random_key
   DB_PASSWORD=secure_password
   ```

3. **Run with Docker Compose**
   ```bash
   docker-compose up -d
   ```

4. **Install dependencies and start development**
   ```bash
   # Backend
   cd backend
   npm install
   npm run start:dev

   # Frontend
   cd ../frontend
   npm install
   npm run dev
   ```

## 🔐 Security
- Azure secrets are AES-256 encrypted at rest.
- Deployment operations run in isolated temporary directories.
- OpenAI keys are never stored in the database.

## 📄 License
MIT
