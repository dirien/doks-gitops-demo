import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as eks from "@pulumi/eks";

// Common tags for all resources
const tags = {
    Environment: "dev",
    Terraform: "true",
};

// Get available availability zones
const availableZones = aws.getAvailabilityZones({
    state: "available",
});

// Create VPC with 10.0.0.0/16 CIDR
const vpc = new aws.ec2.Vpc("example-vpc", {
    cidrBlock: "10.0.0.0/16",
    enableDnsHostnames: true,
    enableDnsSupport: true,
    tags: {
        ...tags,
        Name: "example-vpc",
    },
});

// Create Internet Gateway
const internetGateway = new aws.ec2.InternetGateway("example-igw", {
    vpcId: vpc.id,
    tags: {
        ...tags,
        Name: "example-igw",
    },
});

// Create two public subnets in different availability zones
const publicSubnet1 = new aws.ec2.Subnet("public-subnet-1", {
    vpcId: vpc.id,
    cidrBlock: "10.0.1.0/24",
    availabilityZone: availableZones.then(az => az.names[0]),
    mapPublicIpOnLaunch: true,
    tags: {
        ...tags,
        Name: "public-subnet-1",
        "kubernetes.io/role/elb": "1",
    },
});

const publicSubnet2 = new aws.ec2.Subnet("public-subnet-2", {
    vpcId: vpc.id,
    cidrBlock: "10.0.2.0/24",
    availabilityZone: availableZones.then(az => az.names[1]),
    mapPublicIpOnLaunch: true,
    tags: {
        ...tags,
        Name: "public-subnet-2",
        "kubernetes.io/role/elb": "1",
    },
});

// Create route table for public subnets
const publicRouteTable = new aws.ec2.RouteTable("public-route-table", {
    vpcId: vpc.id,
    tags: {
        ...tags,
        Name: "public-route-table",
    },
});

// Create route to Internet Gateway (0.0.0.0/0 -> IGW)
const publicRoute = new aws.ec2.Route("public-route", {
    routeTableId: publicRouteTable.id,
    destinationCidrBlock: "0.0.0.0/0",
    gatewayId: internetGateway.id,
});

// Associate route table with public subnets
const routeTableAssociation1 = new aws.ec2.RouteTableAssociation("public-rta-1", {
    subnetId: publicSubnet1.id,
    routeTableId: publicRouteTable.id,
});

const routeTableAssociation2 = new aws.ec2.RouteTableAssociation("public-rta-2", {
    subnetId: publicSubnet2.id,
    routeTableId: publicRouteTable.id,
});

// Create EKS cluster
const cluster = new eks.Cluster("example", {
    name: "example",
    version: "1.31",
    vpcId: vpc.id,
    publicSubnetIds: [publicSubnet1.id, publicSubnet2.id],
    endpointPublicAccess: true,
    endpointPrivateAccess: false,
    instanceType: "t3.medium",
    desiredCapacity: 2,
    minSize: 1,
    maxSize: 3,
    tags: tags,
});

// Export cluster information
export const clusterName = cluster.eksCluster.name;
export const kubeconfig = cluster.kubeconfig;
export const vpcId = vpc.id;
export const publicSubnetIds = [publicSubnet1.id, publicSubnet2.id];
