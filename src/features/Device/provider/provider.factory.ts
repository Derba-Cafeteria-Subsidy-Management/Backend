// src/modules/biometric/factories/provider.factory.ts

import { BiometricProvider, MockProvider, ZKTecoProvider } from "./BiometricProvider";




export class ProviderFactory {
  static create(
    provider: string
  ): BiometricProvider {

    switch (
      provider.toUpperCase()
    ) {
      case "MOCK":
        return new MockProvider();

      case "ZKTECO":
        return new ZKTecoProvider();

     /*  case "SUPREMA":
        return new SupremaProvider(); */

      default:
        throw new Error(
          `Unsupported provider: ${provider}`
        );
    }
  }
}