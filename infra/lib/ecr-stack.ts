import { Duration, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import * as ecr from "aws-cdk-lib/aws-ecr";
import type { Construct } from "constructs";

const KEEP_IMAGE_COUNT = 30;

export class EcrStack extends Stack {
  readonly webRepo: ecr.Repository;
  readonly apiRepo: ecr.Repository;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.webRepo = this.createRepository("WebRepo");
    this.apiRepo = this.createRepository("ApiRepo");
  }

  private createRepository(id: string): ecr.Repository {
    return new ecr.Repository(this, id, {
      imageScanOnPush: true,
      // タグの上書きで別のイメージが動くことを防ぐ（デプロイは commit SHA のタグで行う）
      imageTagMutability: ecr.TagMutability.IMMUTABLE,
      removalPolicy: RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          rulePriority: 1,
          description: "未タグのイメージを削除する",
          tagStatus: ecr.TagStatus.UNTAGGED,
          maxImageAge: Duration.days(1),
        },
        {
          rulePriority: 2,
          description: "最新のイメージだけを保持する",
          tagStatus: ecr.TagStatus.ANY,
          maxImageCount: KEEP_IMAGE_COUNT,
        },
      ],
    });
  }
}
