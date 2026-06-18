export const positionInformation: { name: string; id: number }[] = [
    { name: 'N/D', id: -1 },
    { name: 'GK', id: 0 },
    { name: 'CB', id: 5 },
    { name: 'RB', id: 3 },
    { name: 'LB', id: 7 },
    { name: 'CM', id: 14 },
    { name: 'CDM', id: 10 },
    { name: 'CAM', id: 18 },
    { name: 'LM', id: 16 },
    { name: 'RM', id: 12 },
    { name: 'LW', id: 27 },
    { name: 'RW', id: 23 },
    { name: 'ST', id: 25 }
];

export function positionIdToName(id: number): string {
    return positionInformation.find(x => x.id === id)?.name ?? 'N/D';
}

export function positionNameToId(name: string): number {
    return positionInformation.find(
        x => x.name.toUpperCase() === name.toUpperCase()
    )?.id ?? -1;
}