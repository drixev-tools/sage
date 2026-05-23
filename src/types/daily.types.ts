interface DailyStatus {
    label: string,
    yesterday: string,
    today: string,
    blockers: string,
}

export interface DailySpeach {
    short: DailyStatus,
    medium: DailyStatus
}