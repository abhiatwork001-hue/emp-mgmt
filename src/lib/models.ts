import mongoose, { Schema, Document, Types } from 'mongoose';

// --- Interfaces ---

export type ObjectId = Types.ObjectId | string;

export type ITranslations = Record<string, {
    name?: string;
    description?: string;
    title?: string;
    label?: string;
    address?: string;
}>;

export interface ICompany extends Document {
    name: string;
    logo?: string; // New field
    taxNumber?: string;
    address?: string;
    owners: { name: string; contact?: string; id?: ObjectId }[];
    totalVacationsPerYear: number;
    weekStartsOn?: "monday" | "sunday";
    branches: ObjectId[]; // Reference to Store
    globalDepartments: ObjectId[]; // Reference to GlobalDepartment
    employees: ObjectId[]; // Reference to Employee
    active: boolean;
    settings?: {
        scheduleRules: {
            deadlineDay: number; // 0-6
            deadlineTime: string; // "HH:MM"
            alertEnabled: boolean;
        };
    };
    archivedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IGlobalDepartment extends Document {
    name: string;
    slug: string;
    description?: string;
    hasHead?: boolean;
    departmentHead?: ObjectId[]; // employee ids for department heads
    subHead?: ObjectId[]; // employee ids for sub heads
    employees?: ObjectId[]; // all employees in this department across all stores
    defaultPositions?: ObjectId[]; // position ids
    translations?: ITranslations;
    active: boolean;
    archivedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IStore extends Document {
    companyId: ObjectId;
    name: string;
    slug: string;
    address?: string;
    translations?: ITranslations;
    managers: ObjectId[]; // employee ids
    subManagers: ObjectId[];
    employees: ObjectId[];
    minEmployees?: number;
    maxEmployees?: number;
    targetWeeklyHours?: number;

    // Google Reviews
    googlePlaceId?: string;
    googleRating?: number;
    googleUserRatingsTotal?: number;
    googleReviews?: {
        author_name: string;
        rating: number;
        text: string;
        time: number;
        relative_time_description: string;
    }[];
    ratingHistory?: {
        date: Date;
        rating: number;
        change?: number; // Change from previous rating
        reviewsCount?: number; // Total reviews at this point
        starDistribution?: {
            1: number;
            2: number;
            3: number;
            4: number;
            5: number;
        };
    }[];
    googleStarDistribution?: {
        1: number;
        2: number;
        3: number;
        4: number;
        5: number;
    };
    lastReviewsUpdate?: Date;
    monthlyStats?: {
        year: number;
        month: number;
        avgRating: number;
        totalReviews: number;
        newReviews: number;
        commentsCount: number;
        starDistribution: {
            1: number;
            2: number;
            3: number;
            4: number;
            5: number;
        };
    }[];

    // Weather Cache
    weatherCache?: {
        temp: number;
        feelsLike: number;
        condition: string;
        icon: string;
        humidity?: number;
        windSpeed?: number;
        lastUpdated: Date;
    };

    settings?: {
        supplierAlertPreferences: {
            defaultAlertOffset: number;
            exceptions: { supplierId: ObjectId; alertOffset: number; ignored?: boolean }[];
        };
    };

    active: boolean;
    archivedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IStoreDepartment extends Document {
    storeId: ObjectId;
    globalDepartmentId?: ObjectId;
    name: string;
    slug: string;
    description?: string;
    headOfDepartment: ObjectId[]; // employee ids
    subHead?: ObjectId[]; // employee ids
    employees: ObjectId[];
    positionsAllowed?: ObjectId[]; // position ids
    minEmployees?: number; // New field
    maxEmployees?: number; // New field
    targetEmployees?: number; // New field
    minWeeklyHours?: number; // New field
    maxWeeklyHours?: number; // New field
    targetWeeklyHours?: number; // New field
    translations?: ITranslations;
    active: boolean;
    archivedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IRole extends Document {
    name: string;
    description?: string;
    permissions: string[]; // List of permission keys
    translations?: ITranslations;
    isSystemRole?: boolean; // If true, cannot be deleted (e.g. Admin)
    active: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IPosition extends Document {
    name: string;
    slug: string; // Added slug
    level?: number;
    roles: ObjectId[]; // Reference to Role
    permissions?: string[]; // Granular functional permissions
    translations?: ITranslations;
    isStoreSpecific?: boolean;
    isDepartmentSpecific?: boolean; // Scope restriction
    storeId?: ObjectId;
    active: boolean;
    archivedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IPositionHistory {
    positionId: ObjectId;
    storeId?: ObjectId;
    storeDepartmentId?: ObjectId;
    reason?: string; // Reason for appointment
    from: Date;
    to?: Date;
    assignedBy?: ObjectId;
}

// Merged User + Employee
export interface IEmployee extends Document {
    // Auth & Profile
    email: string; // Unique, required for login
    password?: string; // For auth
    image?: string;
    firstName: string;
    lastName: string;
    slug: string; // Added slug
    dob?: Date;
    phone?: string;
    address?: string; // Home address
    nif?: string; // Tax ID
    emergencyContact?: {
        name: string;
        relationship: string;
        phoneNumber: string;
        email: string;
    };

    // Banking
    bankName?: string;
    iban?: string;
    country?: string;

    // Employment Details
    joinedOn?: Date;
    storeId?: ObjectId;
    storeDepartmentId?: ObjectId;
    positionId?: ObjectId;
    positions?: ObjectId[]; // Support for multiple positions

    roles?: string[]; // Admin, HR, Manager, Employee

    vacationTracker?: IVacationTracker; // Embedded tracker

    vacations?: ObjectId[]; // VacationRecord ids
    absences?: ObjectId[]; // AbsenceRecord ids (legacy or specific list)
    schedules?: ObjectId[]; // Schedule ids they appear in

    positionHistory?: IPositionHistory[];

    contract?: {
        weeklyHours: number;
        workingDays: number[];
        maxOvertime?: number;
        employmentType?: "Contracted" | "Freelancer" | "Extra";
        vacationAllowed?: boolean;
    };

    departmentHistory?: { storeDepartmentId: ObjectId; from: Date; to?: Date }[];
    storeHistory?: { storeId: ObjectId; from: Date; to?: Date }[];

    documents?: {
        type: string;
        value: string;
        validity?: Date;
    }[];

    isPasswordChanged?: boolean;
    passwordResetRequested?: boolean;
    pushSubscription?: any; // Browser push token (PWA)
    pushSubscriptionNative?: string[]; // Native tokens (FCM/APNS)
    lastLogin?: Date;
    active?: boolean;
    terminatedOn?: Date;

    createdAt?: Date;
    updatedAt?: Date;
}

export interface IVacationTracker {
    defaultDays: number; // e.g. 22
    rolloverDays: number; // Leftover from last year
    usedDays: number;
    pendingRequests: number; // Count of days currently requested
    remainingDays: number; // Virtual or calculated
    year: number;
}

export interface IShiftDefinition extends Document {
    name: string; // "Morning", "Night"
    startTime: string; // "09:00"
    endTime: string; // "17:00"
    color?: string; // Hex code
    breakMinutes?: number;
    description?: string;
    requiredHeadcount?: number; // Target
    maxAllowedHeadcount?: number; // Limit
    translations?: ITranslations;
    storeDepartmentId?: ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IDayShift {
    shiftName: string;
    startTime?: string; // ISO time or HH:MM
    endTime?: string;
    breakMinutes?: number;
    color?: string;
    actualHours?: number;
    employees: ObjectId[]; // employee ids
    requiredHeadcount?: number; // New field
    notes?: string;
    meta?: any;
    isOvertime?: boolean;
}

export interface IDay {
    date: Date;
    shifts: IDayShift[];
}

export interface ISchedule extends Document {
    storeId: ObjectId;
    storeDepartmentId: ObjectId;
    slug: string; // Added slug
    weekNumber: number;
    year: number;
    dateRange: {
        startDate: Date;
        endDate: Date;
    };
    status: 'draft' | 'review' | 'approved' | 'rejected' | 'published';
    approvalHistory: {
        status: string;
        changedBy: ObjectId;
        comment?: string;
        createdAt: Date;
    }[];
    createdBy: ObjectId;
    days: {
        date: Date;
        isHoliday?: boolean;
        holidayName?: string;
        shifts: {
            _id?: ObjectId;
            shiftDefinitionId?: ObjectId;
            shiftName: string;
            startTime: string;
            endTime: string;
            breakMinutes?: number;
            color?: string;
            employees: ObjectId[];
            notes?: string;
        }[];
    }[];
    notes?: string;
    lastChanges?: string[]; // New: Summary of last update diff
    createdAt?: Date;
    updatedAt?: Date;
}
export interface IVacationRecord extends Document {
    employeeId: ObjectId;
    from: Date;
    to: Date;
    totalDays: number;
    year: number;
    approvedBy?: ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
}

export type RequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface IVacationRequest extends Document {
    employeeId: ObjectId;
    requestedFrom: Date;
    requestedTo: Date;
    totalDays: number;
    comments?: string;
    status: RequestStatus;
    reviewedBy?: ObjectId;
    reviewedAt?: Date;
    storeDepartmentWarnings?: string[]; // e.g. conflict messages
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IAbsenceRecord extends Document {
    employeeId: ObjectId;
    date: Date;
    reason?: string;
    type?: string; // New: "sick", "personal"
    justification?: "Justified" | "Unjustified"; // New
    attachments?: string[]; // URLs to attachment files
    shiftRef?: { scheduleId: ObjectId; dayDate: Date; shiftName?: string };
    approvedBy?: ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IAbsenceRequest extends Document {
    employeeId: ObjectId;
    date: Date;
    shiftId?: ObjectId; // If requesting absence for specific shift
    type?: string; // "sick", "late", "personal"
    reason?: string;
    justification?: "Justified" | "Unjustified"; // New (assigned during approval)
    attachments?: string[]; // New: URLs to proof files
    status: RequestStatus;
    approvedBy?: ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IExtraHourRequest extends Document {
    employeeId: ObjectId;
    date: Date;
    hoursRequested: number;
    note?: string;
    status: RequestStatus;
    approvedBy?: ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
}


// --- Schemas ---

const PositionHistorySchema = new Schema({
    positionId: { type: Schema.Types.ObjectId, ref: 'Position' },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store' },
    storeDepartmentId: { type: Schema.Types.ObjectId, ref: 'StoreDepartment' },
    reason: { type: String },
    from: { type: Date, default: Date.now },
    to: { type: Date },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'Employee' },
}, { _id: false });

const VacationTrackerSchema = new Schema({
    defaultDays: { type: Number, default: 0 },
    rolloverDays: { type: Number, default: 0 },
    usedDays: { type: Number, default: 0 },
    pendingRequests: { type: Number, default: 0 },
    year: { type: Number, default: new Date().getFullYear() },
}, { _id: false, toJSON: { virtuals: true }, toObject: { virtuals: true }, id: false });

VacationTrackerSchema.virtual('remainingDays').get(function () {
    return (this.defaultDays || 0) + (this.rolloverDays || 0) - (this.usedDays || 0);
});

const CompanySchema = new Schema<ICompany>({
    name: { type: String, required: true },
    logo: { type: String }, // New: Company Logo URL
    taxNumber: { type: String },
    address: { type: String },
    owners: [{
        name: { type: String },
        contact: { type: String },
        id: { type: Schema.Types.ObjectId, ref: 'Employee' } // Optional reference if owner is employee
    }],
    totalVacationsPerYear: { type: Number, default: 22 }, // Example default
    weekStartsOn: { type: String, enum: ['monday', 'sunday'], default: 'monday' },
    branches: [{ type: Schema.Types.ObjectId, ref: 'Store' }],
    globalDepartments: [{ type: Schema.Types.ObjectId, ref: 'GlobalDepartment' }],
    employees: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
    active: { type: Boolean, default: true },
    archivedAt: { type: Date },
    settings: {
        scheduleRules: {
            deadlineDay: { type: Number, default: 2 }, // 2 = Tuesday
            deadlineTime: { type: String, default: "17:00" },
            alertEnabled: { type: Boolean, default: true }
        }
    }
}, { timestamps: true });

const GlobalDepartmentSchema = new Schema<IGlobalDepartment>({
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String },
    hasHead: { type: Boolean, default: false },
    departmentHead: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
    subHead: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
    employees: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
    defaultPositions: [{ type: Schema.Types.ObjectId, ref: 'Position' }],
    translations: { type: Map, of: Object },
    active: { type: Boolean, default: true },
    archivedAt: { type: Date }
}, { timestamps: true });

const StoreSchema = new Schema<IStore>({
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    address: { type: String },
    translations: { type: Map, of: Object },
    managers: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
    subManagers: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
    employees: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
    minEmployees: { type: Number, default: 0 },
    maxEmployees: { type: Number },
    targetWeeklyHours: { type: Number }, // New: Target total hours for the store

    // Google Reviews Integration
    googlePlaceId: { type: String },
    googleRating: { type: Number, default: 0 },
    googleUserRatingsTotal: { type: Number, default: 0 },
    googleReviews: [{
        author_name: String,
        rating: Number,
        text: String,
        time: Number, // Unix timestamp
        relative_time_description: String
    }],
    ratingHistory: [{
        date: Date,
        rating: Number,
        reviewsCount: { type: Number, default: 0 },
        change: { type: Number, default: 0 },
        starDistribution: {
            1: { type: Number, default: 0 },
            2: { type: Number, default: 0 },
            3: { type: Number, default: 0 },
            4: { type: Number, default: 0 },
            5: { type: Number, default: 0 }
        }
    }],
    googleStarDistribution: {
        1: { type: Number, default: 0 },
        2: { type: Number, default: 0 },
        3: { type: Number, default: 0 },
        4: { type: Number, default: 0 },
        5: { type: Number, default: 0 }
    },
    lastReviewsUpdate: { type: Date },

    settings: {
        supplierAlertPreferences: {
            defaultAlertOffset: { type: Number, default: 0 }, // 0 = Same day as deadline
            exceptions: [{
                supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier' },
                alertOffset: { type: Number }
            }]
        }
    },

    monthlyStats: [{
        year: Number,
        month: Number,
        avgRating: Number,
        totalReviews: Number,
        newReviews: Number,
        commentsCount: Number,
        starDistribution: {
            1: { type: Number, default: 0 },
            2: { type: Number, default: 0 },
            3: { type: Number, default: 0 },
            4: { type: Number, default: 0 },
            5: { type: Number, default: 0 }
        }
    }],

    active: { type: Boolean, default: true },
    archivedAt: { type: Date }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

StoreSchema.virtual('departments', {
    ref: 'StoreDepartment',
    localField: '_id',
    foreignField: 'storeId'
});

const StoreDepartmentSchema = new Schema<IStoreDepartment>({
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    globalDepartmentId: { type: Schema.Types.ObjectId, ref: 'GlobalDepartment' },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String },
    headOfDepartment: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
    subHead: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
    employees: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
    positionsAllowed: [{ type: Schema.Types.ObjectId, ref: 'Position' }],
    minEmployees: { type: Number, default: 0 },
    maxEmployees: { type: Number }, // New: Max limit
    targetEmployees: { type: Number, default: 0 },
    minWeeklyHours: { type: Number, default: 0 }, // New
    maxWeeklyHours: { type: Number }, // New
    targetWeeklyHours: { type: Number, default: 0 }, // New
    translations: { type: Map, of: Object },
    active: { type: Boolean, default: true },
    archivedAt: { type: Date }
}, { timestamps: true });

const RoleSchema = new Schema<IRole>({
    name: { type: String, required: true, unique: true },
    description: { type: String },
    permissions: [{ type: String }], // e.g. "create_store"
    translations: { type: Map, of: Object },
    isSystemRole: { type: Boolean, default: false },
    active: { type: Boolean, default: true }
}, { timestamps: true });

const PositionSchema = new Schema<IPosition>({
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    level: { type: Number },
    roles: [{ type: Schema.Types.ObjectId, ref: 'Role' }],
    permissions: [{ type: String }],
    translations: { type: Map, of: Object },
    isStoreSpecific: { type: Boolean, default: false },
    isDepartmentSpecific: { type: Boolean, default: false },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store' },
    active: { type: Boolean, default: true },
    archivedAt: { type: Date }
}, { timestamps: true });

const EmployeeSchema = new Schema<IEmployee>({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    image: { type: String },
    dob: { type: Date },
    phone: { type: String },
    address: { type: String }, // Home address
    nif: { type: String }, // Tax ID

    // Emergency Contact
    emergencyContact: {
        name: { type: String },
        relationship: { type: String },
        phoneNumber: { type: String },
        email: { type: String }
    },

    // Banking
    bankName: { type: String },
    iban: { type: String },
    country: { type: String },

    joinedOn: { type: Date, default: Date.now },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store' },
    storeDepartmentId: { type: Schema.Types.ObjectId, ref: 'StoreDepartment' },
    positionId: { type: Schema.Types.ObjectId, ref: 'Position' },
    positions: [{ type: Schema.Types.ObjectId, ref: 'Position' }], // Support for multiple positions

    roles: [{ type: String }], // Replaced single role with array

    vacationTracker: { type: VacationTrackerSchema, default: () => ({ defaultDays: 22 }) },

    // Relations stored on Employee for easy access
    vacations: [{ type: Schema.Types.ObjectId, ref: 'VacationRecord' }],
    absences: [{ type: Schema.Types.ObjectId, ref: 'AbsenceRecord' }],
    schedules: [{ type: Schema.Types.ObjectId, ref: 'Schedule' }],

    positionHistory: [PositionHistorySchema],
    departmentHistory: [{
        storeDepartmentId: { type: Schema.Types.ObjectId, ref: 'StoreDepartment' },
        from: { type: Date },
        to: { type: Date }
    }],
    storeHistory: [{
        storeId: { type: Schema.Types.ObjectId, ref: 'Store' },
        from: { type: Date },
        to: { type: Date }
    }],

    active: { type: Boolean, default: true },
    // ... (rest of employee schema)
    terminatedOn: { type: Date },

    // Contract / Working Hours
    contract: {
        weeklyHours: { type: Number, default: 40 },
        workingDays: [{ type: Number }], // 0=Sunday, 1=Monday...
        maxOvertime: { type: Number },
        employmentType: { type: String, enum: ["Contracted", "Freelancer", "Extra", "Trial"], default: "Contracted" },
        vacationAllowed: { type: Boolean, default: true }
    },

    documents: [{
        type: { type: String },
        value: { type: String },
        validity: { type: Date }
    }],

    isPasswordChanged: { type: Boolean, default: false },
    passwordResetRequested: { type: Boolean, default: false },
    pushSubscription: { type: Schema.Types.Mixed },
    pushSubscriptionNative: [{ type: String }],
    lastLogin: { type: Date }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Schedule Sub-schemas
const DayShiftSchema = new Schema({
    shiftDefinitionId: { type: Schema.Types.ObjectId, ref: 'ShiftDefinition' }, // Link to predefined
    shiftName: { type: String },
    startTime: { type: String },
    endTime: { type: String },
    breakMinutes: { type: Number },
    color: { type: String }, // For UI

    // Employees assigned to this specific shift instance
    employees: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
    requiredHeadcount: { type: Number, default: 0 }, // New: Target number of employees for this shift

    isOvertime: { type: Boolean, default: false },
    notes: { type: String },
    meta: { type: Schema.Types.Mixed }, // For custom data like coverage details
}, { _id: true }); // Keep ID to reference specific shift instances if needed

const DaySchema = new Schema({
    date: { type: Date, required: true },
    shifts: [DayShiftSchema],
    isHoliday: { type: Boolean, default: false },
    holidayName: { type: String }
}, { _id: false });

const ScheduleApprovalLogSchema = new Schema({
    status: { type: String, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: 'Employee' },
    comment: { type: String },
    createdAt: { type: Date, default: Date.now }
}, { _id: false });

const ScheduleSchema = new Schema<ISchedule>({
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true }, // Denormalized for easier querying
    storeDepartmentId: { type: Schema.Types.ObjectId, ref: 'StoreDepartment', required: true },
    slug: { type: String, required: true, unique: true },
    weekNumber: { type: Number, required: true },
    year: { type: Number, required: true },
    dateRange: {
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true }
    },

    status: {
        type: String,
        enum: ['draft', 'review', 'approved', 'rejected', 'published'],
        default: 'draft'
    },

    approvalHistory: [ScheduleApprovalLogSchema],

    createdBy: { type: Schema.Types.ObjectId, ref: 'Employee' },
    days: [DaySchema],
    notes: { type: String },
    lastChanges: [{ type: String }]
}, { timestamps: true });

const VacationRecordSchema = new Schema<IVacationRecord>({
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    from: { type: Date, required: true },
    to: { type: Date, required: true },
    totalDays: { type: Number, required: true },
    year: { type: Number, required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'Employee' }
}, { timestamps: true });

const VacationRequestSchema = new Schema<IVacationRequest>({
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    requestedFrom: { type: Date, required: true },
    requestedTo: { type: Date, required: true },
    totalDays: { type: Number, required: true },
    comments: { type: String },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'Employee' },
    reviewedAt: { type: Date },
    storeDepartmentWarnings: [{ type: String }]
}, { timestamps: true });

const AbsenceRecordSchema = new Schema<IAbsenceRecord>({
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: Date, required: true },
    reason: { type: String },
    type: { type: String }, // e.g. "sick", "personal"
    justification: { type: String, enum: ["Justified", "Unjustified"] },
    attachments: [String],
    shiftRef: {
        scheduleId: { type: Schema.Types.ObjectId, ref: 'Schedule' },
        dayDate: { type: Date },
        shiftName: { type: String }
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'Employee' }
}, { timestamps: true });

const AbsenceRequestSchema = new Schema<IAbsenceRequest>({
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: Date, required: true },
    shiftId: { type: Schema.Types.ObjectId, ref: 'Schedule' }, // or ShiftDefinition if needed
    type: { type: String },
    reason: { type: String },
    justification: { type: String, enum: ["Justified", "Unjustified"] },
    attachments: [String], // New field
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'Employee' }
}, { timestamps: true });

const ShiftDefinitionSchema = new Schema<IShiftDefinition>({
    name: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    color: { type: String },
    breakMinutes: { type: Number },
    description: { type: String },
    requiredHeadcount: { type: Number, default: 1 }, // Default needed
    maxAllowedHeadcount: { type: Number }, // New: Max allowed per shift (Limit)
    translations: { type: Map, of: Object },
    storeDepartmentId: { type: Schema.Types.ObjectId, ref: 'StoreDepartment' }
}, { timestamps: true });

// --- Models Export ---

export const Company = mongoose.models.Company || mongoose.model<ICompany>('Company', CompanySchema);
export const GlobalDepartment = mongoose.models.GlobalDepartment || mongoose.model<IGlobalDepartment>('GlobalDepartment', GlobalDepartmentSchema);
export const Store = mongoose.models.Store || mongoose.model<IStore>('Store', StoreSchema);
export const StoreDepartment = mongoose.models.StoreDepartment || mongoose.model<IStoreDepartment>('StoreDepartment', StoreDepartmentSchema);
export const Role = mongoose.models.Role || mongoose.model<IRole>('Role', RoleSchema);
export const Position = mongoose.models.Position || mongoose.model<IPosition>('Position', PositionSchema);
export const Employee = mongoose.models.Employee || mongoose.model<IEmployee>('Employee', EmployeeSchema);
export const Schedule = mongoose.models.Schedule || mongoose.model<ISchedule>('Schedule', ScheduleSchema);
export const VacationRecord = mongoose.models.VacationRecord || mongoose.model<IVacationRecord>('VacationRecord', VacationRecordSchema);
export const VacationRequest = mongoose.models.VacationRequest || mongoose.model<IVacationRequest>('VacationRequest', VacationRequestSchema);
export const AbsenceRecord = mongoose.models.AbsenceRecord || mongoose.model<IAbsenceRecord>('AbsenceRecord', AbsenceRecordSchema);
export const AbsenceRequest = mongoose.models.AbsenceRequest || mongoose.model<IAbsenceRequest>('AbsenceRequest', AbsenceRequestSchema);
export const ShiftDefinition = mongoose.models.ShiftDefinition || mongoose.model<IShiftDefinition>('ShiftDefinition', ShiftDefinitionSchema);

// --- Problem Reporting Models ---

export interface IProblem extends Document {
    title: string;
    description: string;
    priority: "low" | "medium" | "high" | "critical";
    status: "open" | "in_progress" | "resolved" | "wont_fix";
    category: "bug" | "feature_request" | "account" | "other";

    reportedBy: ObjectId;
    storeId?: ObjectId; // Context

    // Discussion
    comments: {
        userId: ObjectId;
        userName: string;
        userImage?: string;
        text: string;
        files?: string[]; // URLs
        createdAt: Date;
    }[];

    // Resolution
    resolvedBy?: ObjectId;
    resolvedAt?: Date;
    resolutionNotes?: string;

    createdAt: Date;
    updatedAt: Date;
}

const ProblemSchema = new Schema<IProblem>({
    title: { type: String, required: true },
    description: { type: String, required: true },
    priority: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium" },
    status: { type: String, enum: ["open", "in_progress", "resolved", "wont_fix"], default: "open" },
    category: { type: String, enum: ["bug", "feature_request", "account", "other"], default: "other" },

    reportedBy: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store' },

    comments: [{
        userId: { type: Schema.Types.ObjectId, ref: 'Employee' },
        userName: { type: String },
        userImage: { type: String },
        text: { type: String },
        files: [{ type: String }],
        createdAt: { type: Date, default: Date.now }
    }],

    resolvedBy: { type: Schema.Types.ObjectId, ref: 'Employee' },
    resolvedAt: { type: Date },
    resolutionNotes: { type: String }
}, { timestamps: true });

export const Problem = mongoose.models.Problem || mongoose.model<IProblem>('Problem', ProblemSchema);

// --- Supplier Models ---

export interface ISupplierItem {
    name: string;
    sku?: string;
    category?: string;
    unit?: string;
    price?: number;
}

export interface ISupplier extends Document {
    name: string;
    contactPerson?: string;
    phoneNumber?: string;
    email?: string;
    address?: string;
    category?: string; // e.g. "Food", "Maintenance"
    items: ISupplierItem[];
    deliverySchedule?: {
        dayOfWeek: number; // 0=Sunday, 1=Monday...
        orderCutoff: {
            leadDays: number; // Days before delivery
            time: string; // "17:00"
        };
    }[];
    temporarySchedules?: {
        name: string;
        startDate: Date;
        endDate: Date;
        schedule: {
            dayOfWeek: number;
            orderCutoff: {
                leadDays: number;
                time: string;
            };
        }[];
    }[];
    createdBy: ObjectId;
    storeId?: ObjectId; // Optional: If specific to a store
    minimumOrderValue?: number; // New: Min limit
    minimumOrderIsTaxExclusive?: boolean; // New: Tax flag
    alertSettings?: {
        notifyRoles: string[]; // e.g., ["store_manager"]
        customLeadTime?: number; // Override default calc
        alertTime?: string; // "09:00"
    };
    active: boolean;
    storePreferences?: {
        storeId: ObjectId;
        preferredOrderDay: number; // 0=Sun, 1=Mon...
    }[];
    createdAt: Date;
    updatedAt: Date;
}

export interface ISupplierOrderCheck extends Document {
    storeId: ObjectId;
    supplierId: ObjectId;
    date: Date;
    status: 'ordered' | 'checked_stock' | 'skipped';
    checkedBy: ObjectId;
    createdAt: Date;
}

const SupplierSchema = new Schema<ISupplier>({
    name: { type: String, required: true },
    contactPerson: { type: String },
    phoneNumber: { type: String },
    email: { type: String },
    address: { type: String },
    category: { type: String },
    items: [{
        name: { type: String },
        sku: { type: String },
        category: { type: String },
        unit: { type: String },
        price: { type: Number }
    }],
    deliverySchedule: [{
        dayOfWeek: { type: Number, required: true },
        orderCutoff: {
            leadDays: { type: Number, required: true },
            time: { type: String, required: true }
        }
    }],
    temporarySchedules: [{
        name: { type: String },
        startDate: { type: Date },
        endDate: { type: Date },
        schedule: [{
            dayOfWeek: { type: Number },
            orderCutoff: {
                leadDays: { type: Number },
                time: { type: String }
            }
        }]
    }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store' },
    minimumOrderValue: { type: Number },
    minimumOrderIsTaxExclusive: { type: Boolean },
    alertSettings: {
        notifyRoles: [{ type: String }],
        customLeadTime: { type: Number },
        alertTime: { type: String }
    },
    storePreferences: [{
        storeId: { type: Schema.Types.ObjectId, ref: 'Store' },
        preferredOrderDay: { type: Number, min: 0, max: 6 }
    }],
    active: { type: Boolean, default: true }
}, { timestamps: true });

const SupplierOrderCheckSchema = new Schema<ISupplierOrderCheck>({
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    date: { type: Date, required: true },
    status: { type: String, enum: ['ordered', 'checked_stock', 'skipped'], required: true },
    checkedBy: { type: Schema.Types.ObjectId, ref: 'Employee', required: true }
}, { timestamps: true });

export const Supplier = mongoose.models.Supplier || mongoose.model<ISupplier>('Supplier', SupplierSchema);
export const SupplierOrderCheck = mongoose.models.SupplierOrderCheck || mongoose.model<ISupplierOrderCheck>("SupplierOrderCheck", SupplierOrderCheckSchema);


// --- Store Resource Model ---

export interface IStoreResource extends Document {
    type: "IT" | "POS" | "Maintenance" | "Insurance" | "Other";
    name: string;
    phoneNumber?: string;
    email?: string;
    info?: string;
    visibility: "global" | "store_specific";
    storeId?: ObjectId;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const StoreResourceSchema = new Schema<IStoreResource>({
    type: { type: String, enum: ["IT", "POS", "Maintenance", "Insurance", "Other"], required: true },
    name: { type: String, required: true },
    phoneNumber: { type: String },
    email: { type: String },
    info: { type: String },
    visibility: { type: String, enum: ["global", "store_specific"], default: "global" },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store' },
    active: { type: Boolean, default: true }
}, { timestamps: true });

export const StoreResource = mongoose.models.StoreResource || mongoose.model<IStoreResource>('StoreResource', StoreResourceSchema);

// Leaving legacy aliases if needed
export const User = Employee; // Alias

interface INotificationRecipient {
    userId: ObjectId;
    read: boolean;
    readAt?: Date;
}

export interface INotification extends Document {
    title: string; // Heading
    message: string;
    type: "info" | "success" | "warning" | "error";
    category: "system" | "schedule" | "vacation" | "absence" | "announcement" | "password_reset";
    link?: string;
    senderId?: ObjectId; // If sent by a specific user

    // Recipients & Status
    recipients: INotificationRecipient[];

    // Context/Metadata
    relatedStoreId?: ObjectId;
    relatedDepartmentId?: ObjectId;
    relatedEmployeeId?: ObjectId;
    metadata?: Record<string, any>;

    createdAt: Date;
    updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>({
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ["info", "success", "warning", "error"], default: "info" },
    category: { type: String, enum: ["system", "schedule", "vacation", "absence", "announcement", "password_reset"], default: "system" },
    link: { type: String },
    senderId: { type: Schema.Types.ObjectId, ref: 'Employee' },

    recipients: [{
        userId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
        read: { type: Boolean, default: false },
        readAt: { type: Date }
    }],

    relatedStoreId: { type: Schema.Types.ObjectId, ref: 'Store' },
    relatedDepartmentId: { type: Schema.Types.ObjectId, ref: 'GlobalDepartment' },
    relatedEmployeeId: { type: Schema.Types.ObjectId, ref: 'Employee' },
    metadata: { type: Map, of: Schema.Types.Mixed },

}, { timestamps: true });

// --- Shift Coverage Models ---

export interface IShiftCoverageRequest extends Document {
    originalShift: {
        scheduleId: ObjectId;
        dayDate: Date;
        shiftName: string;
        startTime: string;
        endTime: string;
        storeId: ObjectId;
        storeDepartmentId: ObjectId;
    };
    originalEmployeeId: ObjectId;
    reason: string;
    attachments: string[]; // URLs

    status: 'pending_hr' | 'seeking_coverage' | 'covered' | 'cancelled';

    // Coverage Workflow
    candidates: ObjectId[]; // Employees invited by HR
    offerSentAt?: Date;

    acceptedBy?: ObjectId; // The winner
    acceptedAt?: Date;

    compensationType?: 'extra_hour' | 'vacation_day'; // HR Preference for the cover
    hrMessage?: string; // Custom message from HR to candidates

    createdAt: Date;
    updatedAt: Date;
}

const ShiftCoverageRequestSchema = new Schema<IShiftCoverageRequest>({
    originalShift: {
        scheduleId: { type: Schema.Types.ObjectId, ref: 'Schedule', required: true },
        dayDate: { type: Date, required: true },
        shiftName: { type: String },
        startTime: { type: String, required: true },
        endTime: { type: String, required: true },
        storeId: { type: Schema.Types.ObjectId, ref: 'Store' },
        storeDepartmentId: { type: Schema.Types.ObjectId, ref: 'StoreDepartment' }
    },
    originalEmployeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    reason: { type: String },
    attachments: [{ type: String }],

    status: {
        type: String,
        enum: ['pending_hr', 'seeking_coverage', 'covered', 'cancelled'],
        default: 'pending_hr'
    },

    candidates: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
    offerSentAt: { type: Date },

    acceptedBy: { type: Schema.Types.ObjectId, ref: 'Employee' },
    acceptedAt: { type: Date },

    compensationType: { type: String, enum: ['extra_hour', 'vacation_day'] },
    hrMessage: { type: String }

}, { timestamps: true });

export const ShiftCoverageRequest = mongoose.models.ShiftCoverageRequest || mongoose.model<IShiftCoverageRequest>('ShiftCoverageRequest', ShiftCoverageRequestSchema);

export interface ITask extends Document {
    title: string;
    slug: string; // Added slug
    description?: string;
    createdBy: ObjectId;

    // Assignment Scopes
    assignedTo: {
        type: 'individual' | 'store' | 'store_department' | 'global_department';
        id: ObjectId;
    }[];

    deadline?: Date;
    priority: 'low' | 'medium' | 'high';
    status: 'todo' | 'in_progress' | 'completed';

    // Sub-items
    todos: {
        _id?: ObjectId;
        text: string;
        completed: boolean;
        completedBy?: ObjectId[];
    }[];

    // Discussion
    comments: {
        _id?: ObjectId;
        userId: ObjectId;
        userName: string;
        text: string;
        createdAt: Date;
    }[];

    // Tracking
    readBy: ObjectId[];
    completedBy: {
        userId: ObjectId;
        completedAt: Date;
    }[];

    // Submissions
    requiresSubmission: boolean;
    requiredFileNames: string[];
    submissions: {
        userId: ObjectId;
        fileUrl: string;
        fileName?: string;
        requirementName?: string;
        submittedAt: Date;
    }[];

    createdAt?: Date;
    updatedAt?: Date;
}

const TaskSchema = new Schema<ITask>({
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },

    assignedTo: [{
        type: { type: String, enum: ['individual', 'store', 'store_department', 'global_department'], required: true },
        id: { type: Schema.Types.ObjectId, required: true, ref: 'Employee' }
    }],

    deadline: { type: Date },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    status: { type: String, enum: ['todo', 'in_progress', 'completed'], default: 'todo' },

    todos: [{
        text: { type: String },
        completed: { type: Boolean, default: false }, // Legacy / Global status
        completedBy: [{ type: Schema.Types.ObjectId, ref: 'Employee' }]
    }],

    comments: [{
        userId: { type: Schema.Types.ObjectId, ref: 'Employee' },
        userName: { type: String },
        text: { type: String },
        createdAt: { type: Date, default: Date.now }
    }],

    readBy: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
    completedBy: [{
        userId: { type: Schema.Types.ObjectId, ref: 'Employee' },
        completedAt: { type: Date }
    }],

    requiresSubmission: { type: Boolean, default: false },
    requiredFileNames: { type: [String], default: [] },
    submissions: [{
        userId: { type: Schema.Types.ObjectId, ref: 'Employee' },
        fileUrl: { type: String },
        fileName: { type: String },
        requirementName: { type: String },
        submittedAt: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

export interface INote extends Document {
    userId: ObjectId;
    title: string;
    slug: string; // Added slug
    content: string; // was text
    isTask: boolean; // toggle to generic note vs todo
    completed: boolean;
    completedAt?: Date;
    deadline?: Date;
    priority?: 'low' | 'medium' | 'high';
    isFeatured?: boolean; // pinned
    createdAt?: Date;
    updatedAt?: Date;
}

const NoteSchema = new Schema<INote>({
    userId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    title: { type: String, default: "New Note" },
    slug: { type: String, required: true, unique: true },
    content: { type: String, required: true },
    isTask: { type: Boolean, default: false },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
    deadline: { type: Date },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    isFeatured: { type: Boolean, default: false }
}, { timestamps: true });

export interface IShiftSwapRequest extends Document {
    requestorId: ObjectId;
    targetUserId: ObjectId;

    // Details of the shift being Offered (My Shift)
    requestorShift: {
        scheduleId: ObjectId;
        dayDate: Date;
        shiftId: ObjectId;
        startTime: string;
        endTime: string;
    };

    // Details of the shift being Requested (Their Shift)
    targetShift: {
        scheduleId: ObjectId;
        dayDate: Date;
        shiftId: ObjectId;
        startTime: string;
        endTime: string;
    };

    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    createdAt: Date;
    updatedAt: Date;
}

const ShiftSwapRequestSchema = new Schema<IShiftSwapRequest>({
    requestorId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    targetUserId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },

    requestorShift: {
        scheduleId: { type: Schema.Types.ObjectId, ref: 'Schedule', required: true },
        dayDate: { type: Date, required: true },
        shiftId: { type: Schema.Types.ObjectId, required: true },
        startTime: { type: String },
        endTime: { type: String }
    },

    targetShift: {
        scheduleId: { type: Schema.Types.ObjectId, ref: 'Schedule', required: true },
        dayDate: { type: Date, required: true },
        shiftId: { type: Schema.Types.ObjectId, required: true },
        startTime: { type: String },
        endTime: { type: String }
    },

    status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending' }
}, { timestamps: true });

export interface IOvertimeRequest extends Document {
    employeeId: ObjectId;
    scheduleId: ObjectId;
    dayDate: Date;
    shiftId: ObjectId;

    // The specific shift details for context
    shiftDetails: {
        startTime: string;
        endTime: string;
        shiftName: string;
    };

    hoursRequested: number; // e.g. 1.5
    reason: string;

    status: 'pending' | 'approved' | 'rejected' | 'cancelled';

    // Approval Log
    reviewedBy?: ObjectId;
    reviewedAt?: Date;
    rejectionReason?: string;

    createdAt: Date;
    updatedAt: Date;
}

const OvertimeRequestSchema = new Schema<IOvertimeRequest>({
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    scheduleId: { type: Schema.Types.ObjectId, ref: 'Schedule', required: true },
    dayDate: { type: Date, required: true },
    shiftId: { type: Schema.Types.ObjectId, required: true },

    shiftDetails: {
        startTime: { type: String },
        endTime: { type: String },
        shiftName: { type: String }
    },

    hoursRequested: { type: Number, required: true },
    reason: { type: String, required: true },

    status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending' },

    reviewedBy: { type: Schema.Types.ObjectId, ref: 'Employee' },
    reviewedAt: { type: Date },
    rejectionReason: { type: String }
}, { timestamps: true });

// --- Reminders ---
export interface IReminder extends Document {
    title: string;
    description?: string;
    type: 'meeting' | 'general' | 'order';
    priority: 'low' | 'medium' | 'high';
    dueDate: Date;
    targetRoles?: string[]; // e.g. ['store_manager']
    targetDepartments?: ObjectId[];
    createdBy: ObjectId;
    isReadBy: { userId: ObjectId; readAt: Date }[];
    createdAt: Date;
    updatedAt: Date;
}

const ReminderSchema = new Schema<IReminder>({
    title: { type: String, required: true },
    description: { type: String },
    type: { type: String, enum: ['meeting', 'general', 'order'], default: 'general' },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    dueDate: { type: Date, required: true },
    targetRoles: [{ type: String }],
    targetDepartments: [{ type: Schema.Types.ObjectId, ref: 'StoreDepartment' }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    isReadBy: [{
        userId: { type: Schema.Types.ObjectId, ref: 'Employee' },
        readAt: { type: Date, default: Date.now }
    }]
}, { timestamps: true });



export interface IProduct extends Document {
    name: string;
    sku?: string;
    supplierId: ObjectId;
    unit: string; // kg, box, etc.
    price?: number;
    isSeasonal: boolean;
    seasonStart?: Date;
    seasonEnd?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>({
    name: { type: String, required: true },
    sku: { type: String },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    unit: { type: String, required: true },
    price: { type: Number },
    isSeasonal: { type: Boolean, default: false },
    seasonStart: { type: Date },
    seasonEnd: { type: Date }
}, { timestamps: true });


// --- Notices ---
export interface INotice extends Document {
    title: string;
    slug: string; // Added slug
    content: string; // HTML/Markdown
    attachments: string[];
    priority: 'normal' | 'urgent';
    targetScope: 'global' | 'store' | 'department' | 'store_department' | 'role_group';
    targetId?: ObjectId; // StoreId or DeptId
    targetRole?: string;
    visibleToAdmin?: boolean;
    expiresAt?: Date;
    createdBy: ObjectId;
    comments: {
        _id?: ObjectId;
        userId: ObjectId;
        content: string;
        createdAt: Date;
    }[];
    createdAt: Date;
    updatedAt: Date;
}

const NoticeSchema = new Schema<INotice>({
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    content: { type: String, required: true },
    attachments: [{ type: String }],
    priority: { type: String, enum: ['normal', 'urgent'], default: 'normal' },
    targetScope: { type: String, enum: ['global', 'store', 'department', 'store_department', 'role_group'], required: true },
    targetId: { type: Schema.Types.ObjectId },
    targetRole: { type: String }, // For 'role_group' queries
    visibleToAdmin: { type: Boolean, default: false },
    expiresAt: { type: Date }, // Null = Forever
    createdBy: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    comments: [{
        userId: { type: Schema.Types.ObjectId, ref: 'Employee' },
        content: String,
        createdAt: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

// --- Store Credentials ---
export interface IStoreCredential extends Document {
    storeId: ObjectId;
    serviceName: string;
    type: 'standard' | 'simple'; // standard = user+pass, simple = name+pass
    username?: string;
    encryptedPassword: string;
    iv: string;
    description?: string;

    history: {
        encryptedPassword: string;
        iv: string;
        changedBy: ObjectId;
        changedAt: Date;
    }[];

    auditLog: {
        action: 'create' | 'update' | 'view';
        userId: ObjectId;
        timestamp: Date;
    }[];

    createdBy: ObjectId;
    updatedBy: ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const StoreCredentialSchema = new Schema<IStoreCredential>({
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    serviceName: { type: String, required: true },
    type: { type: String, enum: ['standard', 'simple'], default: 'standard' },
    username: { type: String }, // Optional now
    encryptedPassword: { type: String, required: true },
    iv: { type: String, required: true },
    description: { type: String },

    history: [{
        encryptedPassword: { type: String },
        iv: { type: String },
        changedBy: { type: Schema.Types.ObjectId, ref: 'Employee' },
        changedAt: { type: Date, default: Date.now }
    }],

    auditLog: [{
        action: { type: String, enum: ['create', 'update', 'view'] },
        userId: { type: Schema.Types.ObjectId, ref: 'Employee' },
        timestamp: { type: Date, default: Date.now }
    }],

    createdBy: { type: Schema.Types.ObjectId, ref: 'Employee' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'Employee' }
}, { timestamps: true });

// --- Internal Evaluations & Surveys ---

export interface IEvaluationTemplate extends Document {
    title: string;
    description?: string;
    sections?: {
        title: string;
        order?: number;
    }[];
    questions: {
        id: string;
        text: string;
        type: 'rating' | 'text' | 'boolean';
        category?: string; // Corresponds to section title or tag
        options?: string[]; // For selectable
        weight?: number;
        required: boolean;
    }[];
    roles?: string[]; // Roles this template is applicable for
    createdBy: ObjectId;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const EvaluationTemplateSchema = new Schema<IEvaluationTemplate>({
    title: { type: String, required: true },
    description: { type: String },
    sections: [{
        title: { type: String },
        order: { type: Number }
    }],
    questions: [{
        id: { type: String, required: true },
        text: { type: String, required: true },
        type: { type: String, enum: ['rating', 'text', 'boolean'], default: 'rating' },
        category: { type: String },
        options: [{ type: String }],
        weight: { type: Number, default: 1 },
        required: { type: Boolean, default: true }
    }],
    roles: [{ type: String }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'Employee' },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

export interface IEvaluationAssignment extends Document {
    templateId: ObjectId;
    storeId: ObjectId;
    assignedTo: ObjectId; // Manager who needs to perform it
    status: 'pending' | 'completed';
    dueDate?: Date;
    completedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const EvaluationAssignmentSchema = new Schema<IEvaluationAssignment>({
    templateId: { type: Schema.Types.ObjectId, ref: 'EvaluationTemplate', required: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
    dueDate: { type: Date },
    completedAt: { type: Date }
}, { timestamps: true });

export interface IEvaluationResponse extends Document {
    assignmentId: ObjectId;
    employeeId: ObjectId; // The Subject
    evaluatorId: ObjectId; // The Reviewer (Manager)
    answers: {
        questionId: string;
        value: string | number | boolean;
    }[];
    isAnonymous: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const EvaluationResponseSchema = new Schema<IEvaluationResponse>({
    assignmentId: { type: Schema.Types.ObjectId, ref: 'EvaluationAssignment', required: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    evaluatorId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    answers: [{
        questionId: { type: String, required: true },
        value: { type: Schema.Types.Mixed, required: true }
    }],
    isAnonymous: { type: Boolean, default: false }
}, { timestamps: true });


// --- Tips Distribution ---
export interface ITipsDistribution extends Document {
    storeId: ObjectId;
    weekStartDate: Date; // Overall start
    weekEndDate: Date;   // Overall end
    totalAmount: number; // Sum of all period amounts
    periods?: {
        startDate: Date;
        endDate: Date;
        amount: number;
    }[];
    records: {
        employeeId: ObjectId;
        employeeName: string; // Snapshot
        shiftsWorked: number;
        calculatedShares: number;
        adjustedShares: number;
        finalAmount: number;
        status?: 'pending' | 'paid';
        periodDetails?: { // Optional breakdown
            periodIndex: number;
            shares: number;
            amount: number;
        }[];
    }[];
    status: 'draft' | 'finalized';
    finalizedBy?: ObjectId;
    finalizedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const TipsDistributionSchema = new Schema<ITipsDistribution>({
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    weekStartDate: { type: Date, required: true },
    weekEndDate: { type: Date, required: true },
    totalAmount: { type: Number, required: true },
    periods: [{
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        amount: { type: Number, required: true }
    }],
    records: [{
        employeeId: { type: Schema.Types.ObjectId, ref: 'Employee' },
        employeeName: { type: String },
        shiftsWorked: { type: Number },
        calculatedShares: { type: Number },
        adjustedShares: { type: Number },
        finalAmount: { type: Number },
        status: { type: String, enum: ['pending', 'paid'], default: 'pending' }, // Added status
        periodDetails: [{
            periodIndex: { type: Number },
            shares: { type: Number },
            amount: { type: Number }
        }]
    }],
    status: { type: String, enum: ['draft', 'finalized'], default: 'draft' },
    finalizedBy: { type: Schema.Types.ObjectId, ref: 'Employee' },
    finalizedAt: { type: Date }
}, { timestamps: true });


const ExtraHourRequestSchema = new Schema<IExtraHourRequest>({
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: Date, required: true },
    hoursRequested: { type: Number, required: true },
    note: { type: String },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'Employee' }
}, { timestamps: true });

export const Notification = mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
export const Task = mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);
// Replaced PersonalTodo with Note
export const Note = mongoose.models.Note || mongoose.model<INote>('Note', NoteSchema);
export const PersonalTodo = Note; // Alias
export const ShiftSwapRequest = mongoose.models.ShiftSwapRequest || mongoose.model<IShiftSwapRequest>('ShiftSwapRequest', ShiftSwapRequestSchema);
export const OvertimeRequest = mongoose.models.OvertimeRequest || mongoose.model<IOvertimeRequest>('OvertimeRequest', OvertimeRequestSchema);
export const ExtraHourRequest = mongoose.models.ExtraHourRequest || mongoose.model<IExtraHourRequest>('ExtraHourRequest', ExtraHourRequestSchema);
export const TipsDistribution = mongoose.models.TipsDistribution || mongoose.model<ITipsDistribution>('TipsDistribution', TipsDistributionSchema);
export const Reminder = mongoose.models.Reminder || mongoose.model<IReminder>('Reminder', ReminderSchema);

export const Product = mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);
export const Notice = mongoose.models.Notice || mongoose.model<INotice>('Notice', NoticeSchema);
export const StoreCredential = mongoose.models.StoreCredential || mongoose.model<IStoreCredential>('StoreCredential', StoreCredentialSchema);
export const EvaluationTemplate = mongoose.models.EvaluationTemplate || mongoose.model<IEvaluationTemplate>('EvaluationTemplate', EvaluationTemplateSchema);
export const EvaluationAssignment = mongoose.models.EvaluationAssignment || mongoose.model<IEvaluationAssignment>('EvaluationAssignment', EvaluationAssignmentSchema);
export const EvaluationResponse = mongoose.models.EvaluationResponse || mongoose.model<IEvaluationResponse>('EvaluationResponse', EvaluationResponseSchema);

// --- Recipe / Food Management ---

export interface ICategory extends Document {
    name: string;
}

export interface IFood extends Document {
    name: string;
    name_en?: string; // Added
    slug: string;
    category: ObjectId; // Ref to Category
    description?: string; // Briefing
    description_en?: string; // Added
    heroImg?: string;
    numberOfDoses?: number;
    yieldAmount?: number;
    yieldUnit?: string;
    portionsInHouse?: number;
    portionsTakeAway?: number;
    // costTotal removed duplicate
    expirationDays: number;

    // Ingredients
    ingredients: {
        name: string;
        name_en?: string; // Added
        amount: number;
        unit: string;
        costPerUnit: number; // e.g. price per Kg
        costForIngredient: number; // calc
        supplier?: string; // fornecedor
        observation?: string;
    }[];

    // Financials
    costTotal: number;
    pvp: number;
    ivaPercent: number;
    ivaAmount: number;
    pvpSemIva: number; // Net
    mb: number; // Margem Bruta
    targetFoodCostPercentage: number; // objectivoDeFoodCost
    theoreticalFoodCost: number; // foodCostTeoricoFinal

    // Execution
    storingTemperature: string;
    cookware: string[];
    instructions: string[];
    instructions_en?: string[]; // Added
    platingImages?: string[];

    // Access and Status
    isPublished: boolean;
    isActive: boolean;
    isDeleted?: boolean;

    // Custom serving info
    servingInHouse?: string;
    servingTakeAway?: string;

    // Access Control
    createdBy: ObjectId;
    accessibleGlobalDepartments: ObjectId[]; // If empty, potentially restricted or public based on logic.
    // Convention: If User's Global Dept is in this list, they can see. If list empty, maybe only creator? Or all Kitchen?
    // We will assume: Empty list = accessible to all "Kitchen" type departments or maybe just visible to creator/admins.

    createdAt?: Date;
    updatedAt?: Date;
}

const CategorySchema = new Schema<ICategory>({
    name: { type: String, required: true, unique: true }
}, { timestamps: true });

const FoodSchema = new Schema<IFood>({
    name: { type: String, required: true, unique: true },
    name_en: { type: String }, // Added
    slug: { type: String, required: true, unique: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    description: { type: String },
    description_en: { type: String }, // Added
    heroImg: { type: String },
    numberOfDoses: { type: Number, default: 1 },
    yieldAmount: { type: Number },
    yieldUnit: { type: String },
    portionsInHouse: { type: Number },
    portionsTakeAway: { type: Number },
    expirationDays: { type: Number, required: true },
    ingredients: [{
        name: { type: String, required: true },
        name_en: { type: String }, // Added
        amount: { type: Number, required: true },
        unit: { type: String, required: true },
        costPerUnit: { type: Number, default: 0 },
        costForIngredient: { type: Number, default: 0 },
        supplier: { type: String },
        observation: { type: String }
    }],

    costTotal: { type: Number, default: 0 },
    pvp: { type: Number, default: 0 },
    ivaPercent: { type: Number, default: 0 },
    ivaAmount: { type: Number, default: 0 },
    pvpSemIva: { type: Number, default: 0 },
    mb: { type: Number, default: 0 }, // Gross Margin
    targetFoodCostPercentage: { type: Number, default: 0 },
    theoreticalFoodCost: { type: Number, default: 0 },

    storingTemperature: { type: String },
    cookware: [{ type: String }],
    instructions: [{ type: String }],
    instructions_en: [{ type: String }], // Added
    platingImages: [{ type: String }],

    isPublished: { type: Boolean, default: false },
    isActive: { type: Boolean, default: false }, // Needs to be published/active to be seen
    isDeleted: { type: Boolean, default: false },

    // Custom serving info
    servingInHouse: { type: String },
    servingTakeAway: { type: String },

    createdBy: { type: Schema.Types.ObjectId, ref: 'Employee' },
    accessibleGlobalDepartments: [{ type: Schema.Types.ObjectId, ref: 'GlobalDepartment' }]

}, { timestamps: true });

export const Category = mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);
export const Food = mongoose.models.Food || mongoose.model<IFood>('Food', FoodSchema);

// --- Messaging Models ---

export interface IMessage extends Document {
    conversationId: ObjectId;
    sender: ObjectId;
    content: string;
    attachments?: {
        url: string;
        type: 'image' | 'file';
        name?: string;
    }[];
    readBy: ObjectId[];
    reactions?: {
        user: ObjectId;
        emoji: string;
    }[];
    isDeleted?: boolean;
    deletedFor?: ObjectId[];
    parentMessageId?: ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

export interface IConversation extends Document {
    participants: ObjectId[];
    type: 'direct' | 'group';
    name?: string;
    lastMessage?: {
        content: string;
        sender: ObjectId;
        createdAt: Date;
    };
    admins?: ObjectId[];
    mutedBy?: ObjectId[];
    deletedBy?: ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>({
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    sender: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    content: { type: String, default: "" }, // Made optional (default empty) for implementation ease
    attachments: [{
        url: String,
        type: { type: String, enum: ['image', 'file', 'audio', 'video'] },
        name: String
    }],
    readBy: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
    reactions: [{
        user: { type: Schema.Types.ObjectId, ref: 'Employee' },
        emoji: String
    }],
    isDeleted: { type: Boolean, default: false },
    deletedFor: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
    parentMessageId: { type: Schema.Types.ObjectId, ref: 'Message' }
}, { timestamps: true, strictPopulate: false } as any);

const ConversationSchema = new Schema<IConversation>({
    participants: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
    type: { type: String, enum: ['direct', 'group'], default: 'direct' },
    name: { type: String },
    lastMessage: {
        content: String,
        sender: { type: Schema.Types.ObjectId, ref: 'Employee' },
        createdAt: Date
    },
    admins: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
    mutedBy: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
    deletedBy: [{ type: Schema.Types.ObjectId, ref: 'Employee' }]
}, { timestamps: true });

export interface IActionLog extends Document {
    action: string;
    performedBy: ObjectId;
    storeId?: ObjectId; // For "Where"
    targetId?: ObjectId;
    targetModel?: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
    createdAt: Date;
}

const ActionLogSchema = new Schema<IActionLog>({
    action: { type: String, required: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'Employee' },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store' },
    targetId: { type: Schema.Types.ObjectId },
    targetModel: { type: String },
    details: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    userAgent: { type: String }
}, { timestamps: { createdAt: true, updatedAt: false } });

// Efficient querying
ActionLogSchema.index({ createdAt: -1 });
ActionLogSchema.index({ performedBy: 1, createdAt: -1 });
ActionLogSchema.index({ storeId: 1, createdAt: -1 });
ActionLogSchema.index({ action: 1, createdAt: -1 });
ActionLogSchema.index({ targetId: 1 });


export const Conversation = mongoose.models.Conversation || mongoose.model<IConversation>('Conversation', ConversationSchema);
export const Message = mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);
export const ActionLog = mongoose.models.ActionLog || mongoose.model<IActionLog>('ActionLog', ActionLogSchema);

export interface IApiUsage extends Document {
    service: string; // "google-places", "openweather", "pusher"
    date: Date; // Normalized to YYYY-MM-DD
    count: number;
    costEstimate: number; // For basic tracking
}

const ApiUsageSchema = new Schema<IApiUsage>({
    service: { type: String, required: true },
    date: { type: Date, required: true },
    count: { type: Number, default: 0 },
    costEstimate: { type: Number, default: 0 }
}, { timestamps: true });

ApiUsageSchema.index({ service: 1, date: 1 }, { unique: true });

export const ApiUsage = mongoose.models.ApiUsage || mongoose.model<IApiUsage>('ApiUsage', ApiUsageSchema);




export { Document };

