import { z } from 'zod';
export declare const CoordinateSchema: z.ZodObject<{
    latitude: z.ZodNumber;
    longitude: z.ZodNumber;
}, z.core.$strip>;
export declare const SignUpSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    full_name: z.ZodString;
    role: z.ZodEnum<{
        driver: "driver";
        commuter: "commuter";
    }>;
    phone: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const SignInSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
export declare const RouteCreateSchema: z.ZodObject<{
    name: z.ZodString;
    code: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    fare_base: z.ZodDefault<z.ZodNumber>;
    start_point: z.ZodObject<{
        latitude: z.ZodNumber;
        longitude: z.ZodNumber;
    }, z.core.$strip>;
    end_point: z.ZodObject<{
        latitude: z.ZodNumber;
        longitude: z.ZodNumber;
    }, z.core.$strip>;
    waypoints: z.ZodDefault<z.ZodArray<z.ZodObject<{
        latitude: z.ZodNumber;
        longitude: z.ZodNumber;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export declare const DriverStartSharingSchema: z.ZodObject<{
    driver_id: z.ZodString;
    route_id: z.ZodString;
    jeepney_id: z.ZodString;
}, z.core.$strip>;
export declare const LocationUpdateSchema: z.ZodObject<{
    driver_id: z.ZodString;
    jeepney_id: z.ZodString;
    route_id: z.ZodString;
    latitude: z.ZodNumber;
    longitude: z.ZodNumber;
    heading: z.ZodOptional<z.ZodNumber>;
    speed: z.ZodOptional<z.ZodNumber>;
    accuracy: z.ZodOptional<z.ZodNumber>;
    timestamp: z.ZodString;
}, z.core.$strip>;
export declare const CommuterSubscribeSchema: z.ZodObject<{
    route_id: z.ZodString;
}, z.core.$strip>;
export type SignUpData = z.infer<typeof SignUpSchema>;
export type SignInData = z.infer<typeof SignInSchema>;
export type RouteCreateData = z.infer<typeof RouteCreateSchema>;
export type DriverStartSharingData = z.infer<typeof DriverStartSharingSchema>;
export type LocationUpdateData = z.infer<typeof LocationUpdateSchema>;
export type CommuterSubscribeData = z.infer<typeof CommuterSubscribeSchema>;
