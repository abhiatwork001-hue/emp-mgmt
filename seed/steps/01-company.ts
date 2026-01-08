import { Company } from '../../src/lib/models';
import { COMPANY_NAME, COMPANY_LOGO, COMPANY_TAX_NUMBER, COMPANY_ADDRESS } from '../constants';

export interface SeedData {
  company?: any;
}

export async function seedCompany(): Promise<any> {
  console.log('📦 Step 1: Creating Company...');
  
  const company = await Company.create({
    name: COMPANY_NAME,
    logo: COMPANY_LOGO,
    taxNumber: COMPANY_TAX_NUMBER,
    address: COMPANY_ADDRESS,
    owners: [], // Will be populated after employees are created
    totalVacationsPerYear: 22,
    weekStartsOn: "monday",
    branches: [],
    globalDepartments: [],
    employees: [],
    active: true,
    settings: {
      scheduleRules: {
        deadlineDay: 2, // Tuesday
        deadlineTime: "17:00",
        alertEnabled: true
      }
    }
  });

  console.log(`✅ Created company: ${company.name}`);
  return company;
}

