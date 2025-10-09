import pulumi
import pulumi_aws as aws
import pulumi_random as random

# Generate a random 6-letter suffix for the bucket name
suffix = random.RandomString("bucket-suffix",
    length=6,
    special=False,
    upper=False,
    numeric=False
)

# Create S3 bucket with random suffix and force_destroy enabled
bucket = aws.s3.Bucket("website-bucket",
    bucket=pulumi.Output.concat("static-website-", suffix.result),
    force_destroy=True
)

# Configure bucket for static website hosting
website_config = aws.s3.BucketWebsiteConfigurationV2("website-config",
    bucket=bucket.id,
    index_document=aws.s3.BucketWebsiteConfigurationV2IndexDocumentArgs(
        suffix="index.html"
    ),
    error_document=aws.s3.BucketWebsiteConfigurationV2ErrorDocumentArgs(
        key="error.html"
    )
)

# Disable block public access settings
public_access_block = aws.s3.BucketPublicAccessBlock("public-access-block",
    bucket=bucket.id,
    block_public_acls=False,
    block_public_policy=False,
    ignore_public_acls=False,
    restrict_public_buckets=False
)

# Create bucket policy to allow public read access
bucket_policy = aws.s3.BucketPolicy("bucket-policy",
    bucket=bucket.id,
    policy=pulumi.Output.json_dumps({
        "Version": "2012-10-17",
        "Statement": [{
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": pulumi.Output.concat("arn:aws:s3:::", bucket.id, "/*")
        }]
    }),
    opts=pulumi.ResourceOptions(depends_on=[public_access_block])
)

# Upload index.html
index_object = aws.s3.BucketObject("index.html",
    bucket=bucket.id,
    key="index.html",
    source=pulumi.FileAsset("html/index.html"),
    content_type="text/html",
    opts=pulumi.ResourceOptions(depends_on=[bucket_policy])
)

# Upload error.html
error_object = aws.s3.BucketObject("error.html",
    bucket=bucket.id,
    key="error.html",
    source=pulumi.FileAsset("html/error.html"),
    content_type="text/html",
    opts=pulumi.ResourceOptions(depends_on=[bucket_policy])
)

# Export the website endpoint URL
pulumi.export("website_url", website_config.website_endpoint.apply(lambda endpoint: f"http://{endpoint}"))
pulumi.export("bucket_name", bucket.id)
