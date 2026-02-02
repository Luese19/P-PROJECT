export declare const API_VERSION = "v1";
export declare const LOCATION_UPDATE_INTERVAL = 5000;
export declare const LOCATION_STALE_THRESHOLD = 30000;
export declare const DEFAULT_MAP_REGION: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
};
export declare const PH_BOUNDS: {
    north: number;
    south: number;
    east: number;
    west: number;
};
export declare const PASIG_CUBAO_BOUNDS: {
    north: number;
    south: number;
    east: number;
    west: number;
};
export declare const AVERAGE_JEEPNEY_SPEED_KPH = 20;
export declare const WALKING_SPEED_KPH = 5;
export declare const NEARBY_THRESHOLD_KM = 0.5;
export declare const APPROACHING_THRESHOLD_KM = 0.2;
export declare const SOCKET_EVENTS: {
    readonly CONNECT: "connect";
    readonly DISCONNECT: "disconnect";
    readonly ERROR: "error";
    readonly DRIVER_LOCATION_UPDATE: "driver:location-update";
    readonly DRIVER_START_SHARING: "driver:start-sharing";
    readonly DRIVER_STOP_SHARING: "driver:stop-sharing";
    readonly COMMUTER_SUBSCRIBE_ROUTE: "commuter:subscribe-route";
    readonly COMMUTER_UNSUBSCRIBE_ROUTE: "commuter:unsubscribe-route";
    readonly COMMUTER_SUBSCRIBE_AREA: "commuter:subscribe-area";
    readonly JEEPNEY_LOCATION_UPDATED: "jeepney:location-updated";
    readonly JEEPNEY_WENT_OFFLINE: "jeepney:went-offline";
    readonly ROUTE_JEEPNEYS_UPDATE: "route:jeepneys-update";
};
export declare const USER_ROLES: {
    readonly DRIVER: "driver";
    readonly COMMUTER: "commuter";
};
export declare const SAMPLE_ROUTES: readonly [{
    readonly code: "PASIG-CUBAO";
    readonly name: "Pasig - Cubao";
    readonly description: "Pasig Palengke to Cubao via C5";
}, {
    readonly code: "CUBAO-PASIG";
    readonly name: "Cubao - Pasig";
    readonly description: "Cubao to Pasig Palengke via C5";
}, {
    readonly code: "MAKATI-QUIAPO";
    readonly name: "Makati - Quiapo";
    readonly description: "Makati CBD to Quiapo via EDSA";
}];
