export interface BiometricEvent {

    employeeId:string;

    deviceId:string;

    timestamp:Date;

    verified:boolean;

    method:

        | "fingerprint"

        | "face"

        | "rfid";
}