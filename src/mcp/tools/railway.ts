import { z } from "zod";
import { apiClient } from "../../api/client.js";
import type { MCPTool } from "../registry.js";

const CREATE_PROJECT_MUTATION = `
mutation CreateProject($name: String!, $teamId: String) {
  projectCreate(input: { name: $name, teamId: $teamId }) {
    project {
      id
      name
      createdAt
    }
  }
}
`;

const DEPLOY_MUTATION = `
mutation Deploy($serviceId: String!, $environmentId: String!) {
  serviceDeploy(input: { serviceId: $serviceId, environmentId: $environmentId }) {
    deployment {
      id
      status
      createdAt
    }
  }
}
`;

const SET_ENV_VARS_MUTATION = `
mutation SetEnvVars($serviceId: String!, $environmentId: String!, $envVars: [EnvVarInput!]!) {
  serviceUpdate(input: { serviceId: $serviceId, environmentId: $environmentId, envVars: $envVars }) {
    service {
      id
      name
    }
  }
}
`;

const DEPLOYMENT_STATUS_QUERY = `
query GetDeploymentStatus($deploymentId: String!) {
  deployment(id: $deploymentId) {
    id
    status
    createdAt
    updatedAt
    service {
      name
    }
  }
}
`;

export const railwayTools: MCPTool[] = [
  {
    name: "create_railway_project",
    description:
      "Create a new Railway project. A project is the top-level container for Railway services, environments, and deployments. Returns the project ID and name.",
    inputSchema: z.object({
      name: z.string().describe("Name for the new Railway project"),
      teamId: z.string().optional().describe("Railway team ID. If not provided, creates under your personal account."),
    }),
    execute: async (input, credentials) => {
      const variables: Record<string, unknown> = { name: input.name };
      if (input.teamId) variables.teamId = input.teamId;

      return apiClient("railway", {
        method: "POST",
        path: "/",
        body: {
          query: CREATE_PROJECT_MUTATION,
          variables,
        },
      }, credentials);
    },
  },
  {
    name: "deploy_to_railway",
    description:
      "Trigger a deployment on a Railway service. The service must already exist in the project. This starts a new deployment using the latest code from the connected repo.",
    inputSchema: z.object({
      serviceId: z.string().describe("The Railway service ID to deploy"),
      environmentId: z.string().describe("The Railway environment ID to deploy to"),
    }),
    execute: async (input, credentials) => {
      return apiClient("railway", {
        method: "POST",
        path: "/",
        body: {
          query: DEPLOY_MUTATION,
          variables: {
            serviceId: input.serviceId,
            environmentId: input.environmentId,
          },
        },
      }, credentials);
    },
  },
  {
    name: "set_railway_env_vars",
    description:
      "Set environment variables on a Railway service. These variables are available to the running application. You can set multiple variables at once.",
    inputSchema: z.object({
      serviceId: z.string().describe("The Railway service ID"),
      environmentId: z.string().describe("The Railway environment ID"),
      envVars: z.array(z.object({
        name: z.string().describe("Environment variable name (e.g. DATABASE_URL)"),
        value: z.string().describe("Environment variable value"),
      })).describe("Array of environment variables to set"),
    }),
    execute: async (input, credentials) => {
      return apiClient("railway", {
        method: "POST",
        path: "/",
        body: {
          query: SET_ENV_VARS_MUTATION,
          variables: {
            serviceId: input.serviceId,
            environmentId: input.environmentId,
            envVars: input.envVars.map((v: { name: string; value: string }) => ({ name: v.name, value: v.value })),
          },
        },
      }, credentials);
    },
  },
  {
    name: "get_railway_deployment_status",
    description:
      "Check the status of a Railway deployment. Returns whether the deployment is building, deploying, succeeded, failed, or crashed, along with timestamps.",
    inputSchema: z.object({
      deploymentId: z.string().describe("The Railway deployment ID to check"),
    }),
    execute: async (input, credentials) => {
      return apiClient("railway", {
        method: "POST",
        path: "/",
        body: {
          query: DEPLOYMENT_STATUS_QUERY,
          variables: { deploymentId: input.deploymentId },
        },
      }, credentials);
    },
  },
];