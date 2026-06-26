import type { Authenticator } from "@app/lib/auth";
import {
  type EnsureSandboxResult,
  type SandboxCreateBlob,
  type SandboxCreateOwner,
  type SandboxDeleteOwner,
  type SandboxLifecycleOwner,
  SandboxResource,
} from "@app/lib/resources/sandbox_resource";
import type { SpaceResource } from "@app/lib/resources/space_resource";
import { SandboxOwnerModel } from "@app/lib/resources/storage/models/sandbox";
import { withTransaction } from "@app/lib/utils/sql_utils";
import type { Result } from "@app/types/shared/result";
import assert from "assert";
import type { Transaction } from "sequelize";

export class PodSandboxResource {
  private static assertPod(space: SpaceResource) {
    assert(space.isProject(), "Only pod spaces can own sandboxes.");
  }

  private static async fetchSandboxByPod(
    auth: Authenticator,
    pod: SpaceResource
  ): Promise<SandboxResource | null> {
    this.assertPod(pod);

    const workspaceModelId = auth.getNonNullableWorkspace().id;
    const link = await SandboxOwnerModel.findOne({
      where: {
        spaceId: pod.id,
        workspaceId: workspaceModelId,
      },
    });

    if (!link) {
      return null;
    }

    return SandboxResource.fetchByModelIdForWorkspace({
      sandboxModelId: link.sandboxId,
      workspaceModelId,
    });
  }

  private static toSandboxCreateOwner(
    auth: Authenticator,
    pod: SpaceResource
  ): SandboxCreateOwner {
    this.assertPod(pod);
    const workspaceModelId = auth.getNonNullableWorkspace().id;

    return {
      lockKey: pod.sId,
      envVars: { SPACE_ID: pod.sId },
      logLabel: "pod",
      fetchSandbox: () => this.fetchSandboxByPod(auth, pod),
      createSandbox: (blob: SandboxCreateBlob) =>
        withTransaction(async (transaction) => {
          const sandbox = await SandboxResource.makeNew(auth, blob, {
            transaction,
          });

          await SandboxOwnerModel.create(
            {
              workspaceId: workspaceModelId,
              spaceId: pod.id,
              sandboxId: sandbox.id,
            },
            { transaction }
          );

          return sandbox;
        }),
    };
  }

  private static toSandboxLifecycleOwner(
    auth: Authenticator,
    pod: SpaceResource
  ): SandboxLifecycleOwner {
    this.assertPod(pod);

    return {
      lockKey: pod.sId,
      fetchSandbox: () => this.fetchSandboxByPod(auth, pod),
    };
  }

  private static toSandboxDeleteOwner(
    auth: Authenticator,
    pod: SpaceResource
  ): SandboxDeleteOwner {
    this.assertPod(pod);

    return {
      lockKey: pod.sId,
      fetchSandbox: () => this.fetchSandboxByPod(auth, pod),
      deleteSandbox: async (
        sandbox: SandboxResource,
        transaction: Transaction
      ) => {
        await SandboxOwnerModel.destroy({
          where: {
            spaceId: pod.id,
            sandboxId: sandbox.id,
            workspaceId: auth.getNonNullableWorkspace().id,
          },
          transaction,
        });
      },
    };
  }

  static async fetchSandbox(
    auth: Authenticator,
    pod: SpaceResource
  ): Promise<SandboxResource | null> {
    return this.fetchSandboxByPod(auth, pod);
  }

  static async ensureSandboxActive(
    auth: Authenticator,
    pod: SpaceResource
  ): Promise<Result<EnsureSandboxResult, Error>> {
    return SandboxResource.ensureActive(
      auth,
      this.toSandboxCreateOwner(auth, pod)
    );
  }

  static async pauseSandboxForApproval(
    auth: Authenticator,
    pod: SpaceResource
  ): Promise<Result<void, Error>> {
    this.assertPod(pod);

    return SandboxResource.pauseForApproval(auth, {
      lockKey: pod.sId,
      fetchSandbox: () => this.fetchSandboxByPod(auth, pod),
    });
  }

  static async deleteSandbox(
    auth: Authenticator,
    pod: SpaceResource
  ): Promise<Result<void, Error>> {
    return SandboxResource.deleteByOwner(
      auth,
      this.toSandboxDeleteOwner(auth, pod)
    );
  }

  static async dangerouslySleepSandboxIfRunning(
    auth: Authenticator,
    pod: SpaceResource
  ): Promise<Result<void, Error>> {
    return SandboxResource.dangerouslySleepIfRunning(
      auth,
      this.toSandboxLifecycleOwner(auth, pod)
    );
  }

  static async dangerouslySleepSandboxIfPendingApproval(
    auth: Authenticator,
    pod: SpaceResource
  ): Promise<Result<void, Error>> {
    return SandboxResource.dangerouslySleepIfPendingApproval(
      auth,
      this.toSandboxLifecycleOwner(auth, pod)
    );
  }

  static async dangerouslyDestroySandboxIfSleeping(
    auth: Authenticator,
    pod: SpaceResource
  ): Promise<Result<void, Error>> {
    return SandboxResource.dangerouslyDestroyIfSleeping(
      auth,
      this.toSandboxLifecycleOwner(auth, pod)
    );
  }

  static async dangerouslyDestroySandboxIfKillRequested(
    auth: Authenticator,
    pod: SpaceResource
  ): Promise<Result<void, Error>> {
    return SandboxResource.dangerouslyDestroyIfKillRequested(
      auth,
      this.toSandboxLifecycleOwner(auth, pod)
    );
  }
}
