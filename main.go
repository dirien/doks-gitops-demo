package main

import (
	"github.com/pulumi/pulumi-digitalocean/sdk/v4/go/digitalocean"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi/config"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		// Load configuration
		cfg := config.New(ctx, "")
		clusterName := cfg.Get("cluster-name")
		if clusterName == "" {
			clusterName = "doks-cluster"
		}
		
		region := cfg.Get("region")
		if region == "" {
			region = "fra1"
		}
		
		nodeSize := cfg.Get("node-size")
		if nodeSize == "" {
			nodeSize = "s-4vcpu-16gb"
		}
		
		nodeCount := cfg.GetInt("node-count")
		if nodeCount == 0 {
			nodeCount = 3
		}

		// Create DigitalOcean Kubernetes cluster
		cluster, err := digitalocean.NewKubernetesCluster(ctx, "doks-cluster", &digitalocean.KubernetesClusterArgs{
			Name:    pulumi.String(clusterName),
			Region:  pulumi.String(region),
			Version: pulumi.String("1.33.1-do.4"), // Neo recommended latest stable
			NodePool: &digitalocean.KubernetesClusterNodePoolArgs{
				Name:      pulumi.String("default"),
				Size:      pulumi.String(nodeSize),
				NodeCount: pulumi.Int(nodeCount),
			},
			Tags: pulumi.StringArray{
				pulumi.String("doks"),
				pulumi.String("pulumi"),
				pulumi.String("dev"),
			},
		})
		if err != nil {
			return err
		}

		// Export cluster information
		ctx.Export("clusterName", cluster.Name)
		ctx.Export("clusterId", cluster.ID())
		ctx.Export("clusterEndpoint", cluster.Endpoint)
		ctx.Export("clusterStatus", cluster.Status)
		ctx.Export("kubeconfig", cluster.KubeConfigs.Index(pulumi.Int(0)).RawConfig())
		ctx.Export("region", pulumi.String(region))
		ctx.Export("nodePoolSize", pulumi.String(nodeSize))
		ctx.Export("nodeCount", pulumi.Int(nodeCount))

		return nil
	})
}
