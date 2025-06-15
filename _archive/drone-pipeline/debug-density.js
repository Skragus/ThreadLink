// Debug script to test density override logic
const config = require('./config');

// Test with your exact scenario
const inputTokens = 139274;
const droneDensity = 5;
const maxDrones = 20;

console.log('=== DENSITY OVERRIDE DEBUG ===');
console.log(`Input tokens: ${inputTokens}`);
console.log(`Requested density: ${droneDensity}`);
console.log(`Max drones: ${maxDrones}`);

// Test the calculateEstimatedDrones function
const estimatedDrones = config.calculateEstimatedDrones(inputTokens, droneDensity);
console.log(`\nEstimated drones (uncapped): ${estimatedDrones}`);
console.log(`Does ${estimatedDrones} > ${maxDrones}? ${estimatedDrones > maxDrones}`);

if (estimatedDrones > maxDrones) {
    const effectiveDroneDensity = (maxDrones * 10000) / inputTokens;
    console.log(`\n🎯 OVERRIDE TRIGGERED!`);
    console.log(`New density: ${droneDensity} → ${effectiveDroneDensity.toFixed(2)}`);
    console.log(`This should create exactly ${maxDrones} drones`);
    
    // Verify the new calculation
    const newEstimatedDrones = config.calculateEstimatedDrones(inputTokens, effectiveDroneDensity);
    console.log(`Verification: New density creates ${newEstimatedDrones} drones`);
} else {
    console.log(`\n❌ NO OVERRIDE - Density override logic did not trigger`);
}
