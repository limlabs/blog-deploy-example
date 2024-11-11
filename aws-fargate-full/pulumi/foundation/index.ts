import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as random from "@pulumi/random";

const config = new pulumi.Config();
const stack = pulumi.getStack();
const org = config.require("org");

const vpc = new awsx.ec2.Vpc("vpc");


const dbSubnetGroup = new aws.rds.SubnetGroup(`${org}-foundation-${stack}`, {
    subnetIds: vpc.privateSubnetIds,
    tags: {
        Name: "DB subnet group",
    },
});

const lbSecurityGroup = new aws.ec2.SecurityGroup("lb", {
    vpcId: vpc.vpcId,
    name: pulumi.interpolate`${org}-foundation-${stack}-lb-sg`,
    ingress: [{
        protocol: "tcp",
        fromPort: 443,
        toPort: 443,
        cidrBlocks: ["0.0.0.0/0"],
    }],
    egress: [{
        protocol: "-1",
        fromPort: 0,
        toPort: 0,
        cidrBlocks: ["0.0.0.0/0"],
    }],
});

const bastionSecurityGroup = new aws.ec2.SecurityGroup("bastion", {
    name: pulumi.interpolate`${org}-foundation-${stack}-bastion-sg`,
    vpcId: vpc.vpcId,
    egress: [
        {
            fromPort: 0,
            toPort: 0,
            protocol: "-1",
            cidrBlocks: ["0.0.0.0/0"],
        },
    ],
});


const appSecurityGroup = new aws.ec2.SecurityGroup("app", {
    vpcId: vpc.vpcId,
    name: pulumi.interpolate`${org}-foundation-${stack}-app-sg`,
    ingress: [
        {
            fromPort: 3000,
            toPort: 3000,
            protocol: "tcp",
            securityGroups: [lbSecurityGroup.id],   
        }
    ],
    egress: [
        {
            fromPort: 0,
            toPort: 0,
            protocol: "-1",
            cidrBlocks: ["0.0.0.0/0"],
        }
    ]
});

const dbSecurityGroup = new aws.ec2.SecurityGroup("group", {
    vpcId: vpc.vpcId,
    ingress: [
        {
            fromPort: 5432,
            toPort: 5432,
            protocol: "tcp",
            securityGroups: [appSecurityGroup.id, bastionSecurityGroup.id],
        },
    ],
    egress: [
        {
            fromPort: 0,
            toPort: 0,
            protocol: "-1",
            cidrBlocks: ["0.0.0.0/0"],
        },
    ],
});


new aws.ec2.SecurityGroupRule("ingress", {
    type: "ingress",
    fromPort: 5432,
    toPort: 5432,
    protocol: "tcp",
    securityGroupId: dbSecurityGroup.id,
    sourceSecurityGroupId: dbSecurityGroup.id,
});

const dbPassword = new random.RandomPassword("dbPassword", {
    length: 24,
    special: false,
});

const database = new aws.rds.Cluster("BlogDB", {
    engine: aws.rds.AuroraPostgresqlEngine,
    clusterIdentifier: pulumi.interpolate`${org}-blog-foundation-${stack}-db`,
    engineMode: "serverless",
    databaseName: "blog",
    masterUsername: "postgres",
    dbSubnetGroupName: dbSubnetGroup.name,
    masterPassword: dbPassword.result,
    skipFinalSnapshot: true,
    vpcSecurityGroupIds: [dbSecurityGroup.id],
    scalingConfiguration: {
        autoPause: false,
        minCapacity: 2,
        maxCapacity: 4,
    },
})

const postgresPrismaURL = pulumi.interpolate`postgresql://${database.masterUsername}:${dbPassword.result}@${database.endpoint}:${database.port}/${database.databaseName}`

const connectionStringSecret = new aws.secretsmanager.Secret("connectionString", { 
    name: pulumi.interpolate`${org}/foundation/${stack}/connectionString` 
});

new aws.secretsmanager.SecretVersion("connectionStringVersion", {
    secretId: connectionStringSecret.id,
    secretString: postgresPrismaURL,
});

const repo = new awsx.ecr.Repository("repo", {
    forceDelete: true,
});

const cluster = new aws.ecs.Cluster("cluster", {
    name: pulumi.interpolate`${org}-foundation-${stack}`
});

// Define IAM Role for EC2 with SSM access
const role = new aws.iam.Role("ssmEc2Role", {
    assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
            {
                Action: "sts:AssumeRole",
                Principal: {
                    Service: "ec2.amazonaws.com",
                },
                Effect: "Allow",
                Sid: "",
            },
        ],
    }),
});

// Attach the AmazonSSMManagedInstanceCore policy for SSM access
new aws.iam.RolePolicyAttachment("ssmEc2RoleAttachment", {
    role: role.name,
    policyArn: "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore",
});

// Define EC2 instance profile for the role
const instanceProfile = new aws.iam.InstanceProfile("ec2InstanceProfile", {
    role: role.name,
});

// User data to ensure SSM Agent is installed (for Amazon Linux 2, already installed in most cases)
const userData = `#!/bin/bash
yum install -y amazon-ssm-agent
systemctl start amazon-ssm-agent
`;

// Create the EC2 instance
const bastionInstance = new aws.ec2.Instance("bastionInstance", {
    ami: "ami-00dff3b01f99da94d", // Amazon Linux 2 AMI ID (update as needed per region)
    instanceType: 't2.micro',
    subnetId: vpc.privateSubnetIds[0],
    iamInstanceProfile: instanceProfile.name,
    userData: userData,
    vpcSecurityGroupIds: [bastionSecurityGroup.id],
    tags: {
        Name: "SSM Bastion Host",
    },
});


const lb = new awsx.lb.ApplicationLoadBalancer("lb", {
    name: pulumi.interpolate`${org}-foundation-${stack}-lb`,
    subnetIds: vpc.publicSubnetIds,
    defaultSecurityGroup: {
        securityGroupId: lbSecurityGroup.id,
    },
});

const mediaBucket = new aws.s3.BucketV2("mediaBucket", {
    bucket: pulumi.interpolate`${org}-blog-foundation-${stack}-media`, 
});


const mediaBucketOwnershipControls = new aws.s3.BucketOwnershipControls("media", {
    bucket: mediaBucket.id,
    rule: {
        objectOwnership: "BucketOwnerPreferred",
    },
});
const mediaBucketPublicAccessBlock = new aws.s3.BucketPublicAccessBlock("media", {
    bucket: mediaBucket.id,
    blockPublicAcls: false,
    blockPublicPolicy: false,
    ignorePublicAcls: false,
    restrictPublicBuckets: false,
});
new aws.s3.BucketAclV2("media", {
    bucket: mediaBucket.id,
    acl: "public-read",
}, {
    dependsOn: [
        mediaBucketOwnershipControls,
        mediaBucketPublicAccessBlock,
    ],
});

export const appURL = pulumi.interpolate`http://${lb.loadBalancer.dnsName}`;
export const dbEndpoint = database.endpoint;
export const connectionStringArn = connectionStringSecret.arn;
export const clusterArn = cluster.arn;
export const lbVpcId = lb.vpcId
export const ecrRepoUrl = repo.url;
export const bastionInstanceId = bastionInstance.id;
export const bastionPublicIp = bastionInstance.publicIp;
export const dbSecurityGroupId = dbSecurityGroup.id;
export const mediaBucketName = mediaBucket.bucket;
export const listenerArn = lb.listeners.apply(listeners => listeners?.[0].arn);
export const privateSubnetIds = vpc.privateSubnetIds;
export const appSecurityGroupId = appSecurityGroup.id;