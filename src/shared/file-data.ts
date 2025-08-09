export interface DriveFlags {
    isCard: boolean;
    isReadOnly: boolean;
    isRemovable: boolean;
    isSCSI: boolean;
    isSystem: boolean;
    isUSB: boolean;
    isVirtual: boolean;
}

export interface Drive {
    available: number;
    busType?: string;
    description?: string;
    driveName: string;
    drivePath: string;
    flags?: DriveFlags;
    logicalBlockSize?: number;
    partitionType?: "mbr" | "gpt" | null | undefined;
    percentageUsed?: string;
    total: number;
    used: number;
}

export interface FileItem {
    name: string;
    type: 'file' | 'folder';
    size?: string;
    dateModified: string;
    dateCreated?: string;
    owner?: string;
    permissions?: string;
    description?: string;
    tags?: string[];
    icon: React.ReactNode;
    driveData?: {
        available: string;
        used: string;
        usagePercentage: string;
    };
}