import * as pulumi from "@pulumi/pulumi";
import * as random from "@pulumi/random";
import * as resources from "@pulumi/azure-native/resources";
import * as storage from "@pulumi/azure-native/storage";
import * as azure from "@pulumi/azure";
import * as dbforpostgresql from "@pulumi/azure-native/dbforpostgresql";
import * as docker_build from "@pulumi/docker-build";

const dbPassword = new random.RandomPassword("dbPassword", {
  length: 24,
  special: false,
});

const suffix = new random.RandomString("suffix", {
  length: 6,
  special: false,
  upper: false,
});

const resourceGroup = new resources.ResourceGroup("resourceGroup", {
  resourceGroupName: 'blog-deploy-example-rg',
  location: "West US",
});

// const storageAccount = new storage.StorageAccount("storageAccount", {
//   accountName: pulumi.interpolate`sablog${suffix.result}`,
//   resourceGroupName: resourceGroup.name,
//   location: resourceGroup.location,
//   allowBlobPublicAccess: true,
//   kind: "StorageV2",
//   sku: {
//     name: "Standard_LRS",
//   },
// });

// const mediaContainer = new storage.BlobContainer("mediaContainer", {
//   resourceGroupName: resourceGroup.name,
//   accountName: storageAccount.name,
//   containerName: "media",
//   publicAccess: "Blob",
// });

// https://registry.pulumi.io/providers/pulumi/azurerm/latest/docs/resources/postgresql_flexible_server
// const pgsql = new dbforpostgresql.Server("pgsql", {
//   serverName: pulumi.interpolate`blog-${suffix.result}-pgsql`,
//   resourceGroupName: resourceGroup.name,
//   version: "16",
//   administratorLogin: "postgres",
//   location: resourceGroup.location,
//   administratorLoginPassword: dbPassword.result,
//   sku: {
//     tier: 'Burstable',
//     name: 'Standard_B1ms'
//   }
// });

// const database = new dbforpostgresql.Database("database", {
//   resourceGroupName: resourceGroup.name,
//   serverName: pgsql.name,
//   charset: "UTF8",
//   collation: "en_US.utf8",
//   databaseName: "blog",
// }, { dependsOn: [pgsql] });

// const databaseURL = pulumi.interpolate`postgresql://${pgsql.administratorLogin}:${dbPassword.result}@${pgsql.fullyQualifiedDomainName}:5432/${database.name}`;

// const acr = new azure.containerservice.Registry("acr", {
//   resourceGroupName: resourceGroup.name,
//   sku: 'Basic',
// });

// const ecrRepository = new aws.ecr.Repository("ecr-repository", {});
// const authToken = aws.ecr.getAuthorizationTokenOutput({
//     registryId: ecrRepository.registryId,
// });
// const myImage = new docker_build.Image("my-image", {
//     cacheFrom: [{
//         registry: {
//             ref: pulumi.interpolate`${ecrRepository.repositoryUrl}:cache`,
//         },
//     }],
//     cacheTo: [{
//         registry: {
//             imageManifest: true,
//             ociMediaTypes: true,
//             ref: pulumi.interpolate`${ecrRepository.repositoryUrl}:cache`,
//         },
//     }],
//     context: {
//         location: "./app",
//     },
//     push: true,
//     registries: [{
//         address: ecrRepository.repositoryUrl,
//         password: authToken.apply(authToken => authToken.password),
//         username: authToken.apply(authToken => authToken.userName),
//     }],
//     tags: [pulumi.interpolate`${ecrRepository.repositoryUrl}:latest`],
// });
// export const ref = myImage.ref;

// export const acrName = acr.name;
// export const mediaContainerURI = pulumi.interpolate`https://${storageAccount.name}.blob.core.windows.net/${mediaContainer.name}`;
export const databaseUrl = databaseURL;

// export const keyVaultSecretName = keyVaultSecret.name;