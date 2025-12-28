import mongoose, { Schema, Document, Types } from 'mongoose';

// --- Interfaces ---

export type ObjectId = Types.ObjectId | string;

export interface ICompany extends Document {
    name: string;
    taxNumber?: string;
    address?: string;
    owners: { name: string; contact?: string; id?: ObjectId }[];
    totalVacationsPerYear: number;
    weekStartsOn?: "monday" | "sunday";
    branches: ObjectId[]; // Reference to Store
    globalDepartments: ObjectId[]; // Reference to GlobalDepartment
    employees: ObjectId[]; // Reference to Employee
    active: boolean;
    archivedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IGlobalDepartment extends Document {
    name: string;
    description?: string;
    hasHead?: boolean;
    departmentHead?: ObjectId[]; // employee ids for department heads
    subHead?: ObjectId[]; // employee ids for sub heads
    employees?: ObjectId[]; // all employees in this department across all stores
    defaultPositions?: ObjectId[]; // position ids
    active: boolean;
    archivedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IStore extends Document {
    companyId: ObjectId;
    name: string;
    address?: string;
    managers: ObjectId[]; // employee ids
    subManagers: ObjectId[];
    employees: ObjectId[];
    active: boolean;
    archivedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IStoreDepartment extends Document {
    storeId: ObjectId;
    globalDepartmentId?: ObjectId;
    name: string;
    description?: string;
    headOfDepartment: ObjectId[]; // employee ids
    subHead?: ObjectId[]; // employee ids
    employees: ObjectId[];
    positionsAllowed?: ObjectId[]; // position ids
    active: boolean;
    archivedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IPosition extends Document {
    name: string;
    level?: number;
    permissions?: string[]; // permission keys
    isStoreSpecific?: boolean;
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
    dob?: Date;
    phone?: string;
    address?: string; // Home address
    nif?: string; // Tax ID

    // Banking
    bankName?: string;
    iban?: string;
    country?: string;

    // Employment Details
    joinedOn?: Date;
    storeId?: ObjectId;
    storeDepartmentId?: ObjectId;
    positionId?: ObjectId;

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
    notes?: string;
    meta?: any;
}

export interface IDay {
    date: Date;
    shifts: IDayShift[];
}

export interface ISchedule extends Document {
    storeId: ObjectId;
    storeDepartmentId: ObjectId;
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
}, { _id: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Virtual for remaining days
VacationTrackerSchema.virtual('remainingDays').get(function () {
    return (this.defaultDays + this.rolloverDays) - this.usedDays;
});

const CompanySchema = new Schema<ICompany>({
    name: { type: String, required: true },
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
    archivedAt: { type: Date }
}, { timestamps: true });

const GlobalDepartmentSchema = new Schema<IGlobalDepartment>({
    name: { type: String, required: true },
    description: { type: String },
    hasHead: { type: Boolean, default: false },
    departmentHead: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
    subHead: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
    employees: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
    defaultPositions: [{ type: Schema.Types.ObjectId, ref: 'Position' }],
    active: { type: Boolean, default: true },
    archivedAt: { type: Date }
}, { timestamps: true });

const StoreSchema = new Schema<IStore>({
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    name: { type: String, required: true },
    address: { type: String },
    managers: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
    subManagers: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
    employees: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
    active: { type: Boolean, default: true },
    archivedAt: { type: Date }
}, { timestamps: true });

const StoreDepartmentSchema = new Schema<IStoreDepartment>({
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    globalDepartmentId: { type: Schema.Types.ObjectId, ref: 'GlobalDepartment' },
    name: { type: String, required: true },
    description: { type: String },
    headOfDepartment: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
    subHead: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
    employees: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
    positionsAllowed: [{ type: Schema.Types.ObjectId, ref: 'Position' }],
    active: { type: Boolean, default: true },
    archivedAt: { type: Date }
}, { timestamps: true });

const PositionSchema = new Schema<IPosition>({
    name: { type: String, required: true },
    level: { type: Number },
    permissions: [{ type: String }],
    isStoreSpecific: { type: Boolean, default: false },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store' },
    active: { type: Boolean, default: true },
    archivedAt: { type: Date }
}, { timestamps: true });

const EmployeeSchema = new Schema<IEmployee>({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    image: { type: String },
    dob: { type: Date },
    phone: { type: String },
    address: { type: String }, // Home address
    nif: { type: String }, // Tax ID

    // Banking
    bankName: { type: String },
    iban: { type: String },
    country: { type: String },

    joinedOn: { type: Date, default: Date.now },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store' },
    storeDepartmentId: { type: Schema.Types.ObjectId, ref: 'StoreDepartment' },
    positionId: { type: Schema.Types.ObjectId, ref: 'Position' },

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
        employmentType: { type: String, enum: ["Contracted", "Freelancer", "Extra"], default: "Contracted" },
        vacationAllowed: { type: Boolean, default: true }
    }
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

    isOvertime: { type: Boolean, default: false },
    notes: { type: String },
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
    notes: { type: String }
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
    justification: { type: String, enum: ["Justified", "Unjustified"] }, // Added field
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
    storeDepartmentId: { type: Schema.Types.ObjectId, ref: 'StoreDepartment' }
}, { timestamps: true });

// --- Models Export ---

export const Company = mongoose.models.Company || mongoose.model<ICompany>('Company', CompanySchema);
export const GlobalDepartment = mongoose.models.GlobalDepartment || mongoose.model<IGlobalDepartment>('GlobalDepartment', GlobalDepartmentSchema);
export const Store = mongoose.models.Store || mongoose.model<IStore>('Store', StoreSchema);
export const StoreDepartment = mongoose.models.StoreDepartment || mongoose.model<IStoreDepartment>('StoreDepartment', StoreDepartmentSchema);
export const Position = mongoose.models.Position || mongoose.model<IPosition>('Position', PositionSchema);
export const Employee = mongoose.models.Employee || mongoose.model<IEmployee>('Employee', EmployeeSchema);
export const Schedule = mongoose.models.Schedule || mongoose.model<ISchedule>('Schedule', ScheduleSchema);
export const VacationRecord = mongoose.models.VacationRecord || mongoose.model<IVacationRecord>('VacationRecord', VacationRecordSchema);
export const VacationRequest = mongoose.models.VacationRequest || mongoose.model<IVacationRequest>('VacationRequest', VacationRequestSchema);
export const AbsenceRecord = mongoose.models.AbsenceRecord || mongoose.model<IAbsenceRecord>('AbsenceRecord', AbsenceRecordSchema);
export const AbsenceRequest = mongoose.models.AbsenceRequest || mongoose.model<IAbsenceRequest>('AbsenceRequest', AbsenceRequestSchema);
export const ShiftDefinition = mongoose.models.ShiftDefinition || mongoose.model<IShiftDefinition>('ShiftDefinition', ShiftDefinitionSchema);

// Leaving legacy aliases if needed temporarily, but preferably use new imports
// ... existing exports ...
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
    category: "system" | "schedule" | "vacation" | "absence" | "announcement";
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
    category: { type: String, enum: ["system", "schedule", "vacation", "absence", "announcement"], default: "system" },
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

export const Notification = mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
