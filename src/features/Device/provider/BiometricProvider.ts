import { BiometricEvent } from "./BiometricEvent";

export interface BiometricProvider {

    connect(): Promise<void>;

    disconnect(): Promise<void>;

    registerDevice(): Promise<void>;

    syncEmployees(): Promise<void>;

    handleEvent(payload: unknown): Promise<void>;

}

// src/modules/biometric/providers/mock.provider.ts


export class MockProvider
  implements BiometricProvider
{
  registerDevice(): Promise<void> {
      throw new Error("Method not implemented.");
  }
  async connect(): Promise<void> {
    console.log(
      "Mock device connected"
    );
  }

  async disconnect(): Promise<void> {
    console.log(
      "Mock device disconnected"
    );
  }

  async syncEmployees(): Promise<void> {
    console.log(
      "Mock employee sync"
    );
  }

  async handleEvent(
    payload: any
  ): Promise<any> {
    return {
      deviceId:
        payload.deviceId,

      employeeNumber:
        payload.employeeNumber,

      verified: true,

      method:
        payload.method ??
        "fingerprint",

      timestamp:
        payload.timestamp
          ? new Date(
              payload.timestamp
            )
          : new Date(),

      payload,
    };
  }
}

export class ZKTecoProvider implements BiometricProvider {

     async connect() {}

    async disconnect() {}

    async registerDevice(){}

    async syncEmployees(){}

    async handleEvent(payload:any){

        console.log(payload);

    }
}