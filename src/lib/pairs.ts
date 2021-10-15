export function generatePairId(symbolA: string, symbolB: string): string {
	let symbols = [symbolA, symbolB].sort();

	return symbols[0] + '_' + symbols[1];
}