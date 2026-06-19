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

export function transfermarktPositionToFifaPosition(value: string | null | undefined): Position | undefined {
    if (!value) {
        return undefined;
    }

    const position = value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();

    const mappings: Array<{ patterns: string[]; position: Position }> = [
        { patterns: ["goalkeeper", "goal keeper", "goleiro"], position: Position.GK },
        { patterns: ["right wing back", "right wingback", "ala direito"], position: Position.RWB },
        { patterns: ["left wing back", "left wingback", "ala esquerdo"], position: Position.LWB },
        { patterns: ["right back", "lateral direito"], position: Position.RB },
        { patterns: ["left back", "lateral esquerdo"], position: Position.LB },
        { patterns: ["centre back", "center back", "central defender", "zagueiro"], position: Position.CB },
        { patterns: ["defensive midfield", "defensive midfielder", "volante"], position: Position.CDM },
        { patterns: ["attacking midfield", "attacking midfielder", "meia atacante"], position: Position.CAM },
        { patterns: ["right midfield", "right midfielder", "meia direita"], position: Position.RM },
        { patterns: ["left midfield", "left midfielder", "meia esquerda"], position: Position.LM },
        { patterns: ["central midfield", "central midfielder", "midfield", "meio campo"], position: Position.CM },
        { patterns: ["right winger", "ponta direita"], position: Position.RW },
        { patterns: ["left winger", "ponta esquerda"], position: Position.LW },
        { patterns: ["second striker", "centre forward", "center forward", "segundo atacante"], position: Position.CF },
        { patterns: ["striker", "forward", "atacante"], position: Position.ST }
    ];

    return mappings.find((mapping) => mapping.patterns.some((pattern) => position === pattern || position.includes(pattern)))?.position;
}
import { Position } from "fifarating";
