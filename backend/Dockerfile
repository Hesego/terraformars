FROM node:20-alpine

# Install Terraform
RUN apk add --no-cache curl gnupg unzip \
    && curl -LO https://releases.hashicorp.com/terraform/1.7.0/terraform_1.7.0_linux_amd64.zip \
    && unzip terraform_1.7.0_linux_amd64.zip \
    && mv terraform /usr/local/bin/ \
    && rm terraform_1.7.0_linux_amd64.zip

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Ensure binaries are executable (safety margin)
RUN chmod +x node_modules/.bin/*

RUN npm run build

EXPOSE 3001

CMD ["npm", "run", "start:prod"]
