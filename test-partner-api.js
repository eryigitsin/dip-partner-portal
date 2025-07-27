// Direct database test to verify partner data
const { drizzle } = require('drizzle-orm/neon-http');
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

async function testPartnerQuery() {
  try {
    console.log('Testing direct database query...');
    const result = await sql`SELECT * FROM partners WHERE user_id = 6`;
    console.log('Partner data:', result);
  } catch (error) {
    console.error('Database error:', error);
  }
}

testPartnerQuery();