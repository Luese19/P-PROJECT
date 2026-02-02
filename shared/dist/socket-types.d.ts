import type { SOCKET_EVENTS } from './constants';
export type SocketEventMap = {
    [SOCKET_EVENTS.DRIVER_START_SHARING]: (data: {
        driver_id: string;
        route_id: string;
        jeepney_id: string;
    }) => void;
    [SOCKET_EVENTS.DRIVER_LOCATION_UPDATE]: (data: {
        driver_id: string;
        jeepney_id: string;
        route_id: string;
        latitude: number;
        longitude: number;
        heading?: number;
        speed?: number;
        timestamp: string;
    }) => void;
    [SOCKET_EVENTS.DRIVER_STOP_SHARING]: (data: {
        driver_id: string;
    }) => void;
    [SOCKET_EVENTS.COMMUTER_SUBSCRIBE_ROUTE]: (route_id: string) => void;
    [SOCKET_EVENTS.COMMUTER_UNSUBSCRIBE_ROUTE]: (route_id: string) => void;
};
export type SocketServerEventMap = {
    [SOCKET_EVENTS.JEEPNEY_LOCATION_UPDATED]: (jeepney: {
        jeepney_id: string;
        driver_id: string;
        route_id: string;
        latitude: number;
        longitude: number;
        heading?: number;
        speed?: number;
        timestamp: string;
    }) => void;
    [SOCKET_EVENTS.JEEPNEY_WENT_OFFLINE]: (jeepney_id: string) => void;
    [SOCKET_EVENTS.ROUTE_JEEPNEYS_UPDATE]: (data: {
        route_id: string;
        jeepneys: Array<{
            jeepney_id: string;
            driver_id: string;
            route_id: string;
            latitude: number;
            longitude: number;
            heading?: number;
            speed?: number;
            timestamp: string;
        }>;
    }) => void;
};
