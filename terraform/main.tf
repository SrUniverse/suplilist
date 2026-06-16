terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.20"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.10"
    }
  }

  # Uncomment and configure for remote state
  # backend "s3" {
  #   bucket         = "suplilist-terraform-state"
  #   key            = "prod/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "terraform-lock"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = var.environment
      Project     = "suplilist"
      ManagedBy   = "Terraform"
    }
  }
}

provider "kubernetes" {
  host                   = aws_eks_cluster.main.endpoint
  cluster_ca_certificate = base64decode(aws_eks_cluster.main.certificate_authority[0].data)
  token                  = data.aws_eks_cluster_auth.main.token
}

provider "helm" {
  kubernetes {
    host                   = aws_eks_cluster.main.endpoint
    cluster_ca_certificate = base64decode(aws_eks_cluster.main.certificate_authority[0].data)
    token                  = data.aws_eks_cluster_auth.main.token
  }
}

data "aws_eks_cluster_auth" "main" {
  name = aws_eks_cluster.main.name
}

# VPC & Networking
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "suplilist-vpc"
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "suplilist-igw"
  }
}

resource "aws_subnet" "public" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 3, count.index)
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "suplilist-public-${count.index + 1}"
  }
}

resource "aws_subnet" "private" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 3, count.index + 3)
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "suplilist-private-${count.index + 1}"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block      = "0.0.0.0/0"
    gateway_id      = aws_internet_gateway.main.id
  }

  tags = {
    Name = "suplilist-public-rt"
  }
}

resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# EKS Cluster
resource "aws_iam_role" "eks_cluster" {
  name = "suplilist-eks-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "eks.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_cluster.name
}

resource "aws_eks_cluster" "main" {
  name            = "suplilist-${var.environment}"
  role_arn        = aws_iam_role.eks_cluster.arn
  version         = var.kubernetes_version

  vpc_config {
    subnet_ids              = concat(aws_subnet.public[*].id, aws_subnet.private[*].id)
    endpoint_private_access = true
    endpoint_public_access  = true
  }

  depends_on = [aws_iam_role_policy_attachment.eks_cluster_policy]

  tags = {
    Name = "suplilist-eks-cluster"
  }
}

# EKS Node Group
resource "aws_iam_role" "eks_nodes" {
  name = "suplilist-eks-nodes-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_worker_node" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.eks_nodes.name
}

resource "aws_iam_role_policy_attachment" "eks_cni" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.eks_nodes.name
}

resource "aws_iam_role_policy_attachment" "eks_ecr" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.eks_nodes.name
}

resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "suplilist-nodes"
  node_role_arn   = aws_iam_role.eks_nodes.arn
  subnet_ids      = aws_subnet.private[*].id
  version         = var.kubernetes_version

  scaling_config {
    desired_size = var.node_count_desired
    max_size     = var.node_count_max
    min_size     = var.node_count_min
  }

  instance_types = var.node_instance_types

  depends_on = [
    aws_iam_role_policy_attachment.eks_worker_node,
    aws_iam_role_policy_attachment.eks_cni,
    aws_iam_role_policy_attachment.eks_ecr,
  ]

  tags = {
    Name = "suplilist-node-group"
  }
}

# RDS PostgreSQL
resource "aws_db_subnet_group" "main" {
  name       = "suplilist-db-subnet"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "suplilist-db-subnet"
  }
}

resource "aws_security_group" "rds" {
  name   = "suplilist-rds-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_db_instance" "postgres" {
  identifier     = "suplilist-${var.environment}"
  engine         = "postgres"
  engine_version = var.postgres_version

  db_name  = "suplilist"
  username = "suplilist"
  password = var.db_password

  instance_class       = var.db_instance_class
  allocated_storage    = var.db_allocated_storage
  storage_type         = "gp3"
  storage_encrypted    = true
  multi_az             = var.environment == "prod" ? true : false

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  skip_final_snapshot             = var.environment != "prod"
  final_snapshot_identifier       = var.environment == "prod" ? "suplilist-prod-final-snapshot-${timestamp()}" : null
  backup_retention_period         = var.environment == "prod" ? 30 : 7
  backup_window                   = "03:00-04:00"
  preferred_maintenance_window    = "sun:04:00-sun:05:00"

  enable_cloudwatch_logs_exports = ["postgresql"]
  deletion_protection             = var.environment == "prod" ? true : false

  tags = {
    Name = "suplilist-postgres"
  }
}

# ElastiCache Redis
resource "aws_elasticache_subnet_group" "main" {
  name       = "suplilist-cache-subnet"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_security_group" "redis" {
  name   = "suplilist-redis-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "suplilist-${var.environment}"
  engine               = "redis"
  engine_version       = var.redis_version
  node_type            = var.redis_node_type
  num_cache_nodes      = var.environment == "prod" ? 3 : 1
  parameter_group_name = "default.redis7"

  port                   = 6379
  subnet_group_name      = aws_elasticache_subnet_group.main.name
  security_group_ids     = [aws_security_group.redis.id]

  automatic_failover_enabled = var.environment == "prod" ? true : false
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  snapshot_retention_limit = var.environment == "prod" ? 30 : 0
  snapshot_window          = "03:00-05:00"
  maintenance_window       = "sun:04:00-sun:06:00"

  tags = {
    Name = "suplilist-redis"
  }
}

# S3 Bucket for file uploads
resource "aws_s3_bucket" "uploads" {
  bucket = "suplilist-uploads-${var.environment}-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name = "suplilist-uploads"
  }
}

resource "aws_s3_bucket_versioning" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

data "aws_caller_identity" "current" {}

output "eks_cluster_name" {
  value = aws_eks_cluster.main.name
}

output "eks_cluster_endpoint" {
  value = aws_eks_cluster.main.endpoint
}

output "rds_endpoint" {
  value = aws_db_instance.postgres.endpoint
}

output "redis_endpoint" {
  value = aws_elasticache_cluster.redis.cluster_nodes[0].address
}

output "s3_bucket_name" {
  value = aws_s3_bucket.uploads.id
}
