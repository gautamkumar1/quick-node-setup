#!/usr/bin/env node

import { execSync } from "child_process";
import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import inquirer from "inquirer";

const projectName = process.argv[2] || "my-node-app";
const projectPath = path.join(process.cwd(), projectName);

console.log(chalk.blue(`Creating project: ${projectName}...`));

async function createProject() {
  try {
    
    const { languageChoice } = await inquirer.prompt([
      {
        type: "list",
        name: "languageChoice",
        message: "Which language would you like to use?",
        choices: ["JavaScript", "TypeScript"],
      },
    ]);

    
    const { dockerChoice } = await inquirer.prompt([
      {
        type: "confirm",
        name: "dockerChoice",
        message: "Do you want to include a Dockerfile for your project?",
        default: false,
      },
    ]);

    
    fs.mkdirSync(projectPath, { recursive: true });

    
    execSync("npm init -y", { cwd: projectPath, stdio: "inherit" });

    
    execSync("npm install express", { cwd: projectPath, stdio: "inherit" });
    execSync("npm install --save-dev nodemon", { cwd: projectPath, stdio: "inherit" });

    
    if (languageChoice === "TypeScript") {
      execSync("npm install --save-dev typescript @types/node @types/express ts-node", { cwd: projectPath, stdio: "inherit" });

      
      const tsconfig = {
        "compilerOptions": {
          "target": "ES2020",
          "module": "NodeNext",
          "moduleResolution": "NodeNext",
          "outDir": "./dist",
          "rootDir": "./src",
          "strict": true,
          "esModuleInterop": true,
          "skipLibCheck": true,
          "forceConsistentCasingInFileNames": true
        },
        "include": ["src/**/*"],
        "exclude": ["node_modules"]
      };
      fs.writeJsonSync(path.join(projectPath, "tsconfig.json"), tsconfig, { spaces: 2 });
    }

    
    const packageJsonPath = path.join(projectPath, "package.json");
    const packageJson = fs.readJsonSync(packageJsonPath);
    packageJson.type = "module";

    
    packageJson.scripts = {
      ...packageJson.scripts,
      start: languageChoice === "JavaScript"
        ? "nodemon src/index.js"
        : "nodemon --exec node --loader ts-node/esm src/index.ts",  
      build: languageChoice === "TypeScript" ? "tsc" : undefined,  
    };

    
    fs.writeJsonSync(packageJsonPath, packageJson, { spaces: 2 });

    
    const srcPath = path.join(projectPath, "src");
    const folders = ["controllers", "middleware", "routes", "utils", "modules"];
    folders.forEach((folder) => {
      fs.mkdirSync(path.join(srcPath, folder), { recursive: true });
    });

    
    fs.writeFileSync(
      path.join(projectPath, ".gitignore"),
      `node_modules/\n.env\n`
    );

    
    fs.writeFileSync(
      path.join(projectPath, ".env"),
      `PORT=3000\n`
    );

    
    let indexFileContent;
    const srcIndexPath = path.join(srcPath, languageChoice === "JavaScript" ? "index.js" : "index.ts");
    if (languageChoice === "JavaScript") {
      indexFileContent = `import express from 'express';
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Your Express server is up and running!');
});

app.listen(PORT, () => {
    console.log(\`Server running at http://localhost:\${PORT}\`);
});
      `;
      fs.writeFileSync(srcIndexPath, indexFileContent);
    } else {
      indexFileContent = `import express from 'express';
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Your Express server is up and running!');
});

app.listen(PORT, () => {
    console.log(\`Server running at http://localhost:\${PORT}\`);
});
      `;
      fs.writeFileSync(srcIndexPath, indexFileContent);
    }

    
    if (dockerChoice) {
      let dockerfileContent;

      if (languageChoice === "JavaScript") {
        
        dockerfileContent = `
        FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/.env ./
COPY --from=builder /app/package.json ./ 
CMD ["node", "src/index.js"]


        `;
      } else if (languageChoice === "TypeScript") {
        
        dockerfileContent = `

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci
COPY src ./src
RUN npm run build
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY --from=builder /app/dist ./dist
COPY .env ./
CMD ["node", "dist/index.js"]

        `;
      }

      
      fs.writeFileSync(path.join(projectPath, "Dockerfile"), dockerfileContent);

      
      fs.writeFileSync(
        path.join(projectPath, ".dockerignore"),
        `node_modules/
dist/
        `
      );
    }

    console.log(chalk.green("Project setup complete!"));
    console.log(chalk.yellow(`\nNext Steps:`));
    console.log(chalk.cyan(`  cd ${projectName}`));
    console.log(chalk.cyan(`  npm run start`));

  } catch (error) {
    console.error(chalk.red("Error creating project:", error.message));
  }
}

createProject();
