export interface AuthenticationSettingsResponse {
  fingerprintEnabled: boolean;
  employeeSearchEnabled: boolean;
}

export interface UpdateAuthenticationSettingsInput {
  fingerprintEnabled: boolean;
  employeeSearchEnabled: boolean;
}