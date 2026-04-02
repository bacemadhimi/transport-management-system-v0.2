export interface IMarque {
    id: number;
    name: string;
    createdDate?: string;
}

export interface IMarqueDto {
    name: string;
    id?: number;
}