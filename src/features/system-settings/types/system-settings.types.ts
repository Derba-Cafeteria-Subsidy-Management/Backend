import { RequestContext } from "../../auth/types/auth.types";

export interface AuthenticationSettingsResponse {
  fingerprintEnabled: boolean;
  employeeSearchEnabled: boolean;
}

export interface UpdateAuthenticationSettingsInput {
  fingerprintEnabled: boolean;
  employeeSearchEnabled: boolean;
}

export interface CreateSystemContext extends RequestContext {
}