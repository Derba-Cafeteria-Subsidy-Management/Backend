import ExcelJS from 'exceljs';
import { Request, Response } from 'express';
import { assertNoPendingCorrections } from './correction.guard';
import { getPayrollReport } from './payroll.service';
import { getCompanyPaymentReport } from './company-payment.service';


export const generatePayrollExcel = async (data: any[]) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Payroll');

  sheet.columns = [
    { header: 'Employee ID', key: 'employeeId' },
    { header: 'Full Name', key: 'employeeName' },
    { header: 'Meal Count', key: 'mealCount' },
    { header: 'Total Cost', key: 'totalMealCost' },
    { header: 'Employee Share', key: 'employeeShare' },
  ];

  sheet.addRows(data);

  return workbook;
};



export const payrollExportHandler = async (req: Request, res: Response) => {
  const { from, to } = req.query as any;

  await assertNoPendingCorrections(from, to);

  const data = await getPayrollReport(from, to);

  const workbook = await generatePayrollExcel(data.data);

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );

  res.setHeader(
    'Content-Disposition',
    `attachment; filename=payroll-${from}-${to}.xlsx`
  );

  await workbook.xlsx.write(res);
  res.end();
};



export const generateCompanyPaymentExcel = async (data: any) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Company Payment");

  sheet.columns = [
    { header: "Total Menu Number", key: "total_menu_number", width: 20 },
    { header: "Total Menu Price", key: "total_menu_price", width: 20 },
    { header: "Total Company Share", key: "total_company_share", width: 20 },
    { header: "Transaction From Date", key: "transactionFromDate", width: 25 },
    { header: "Transaction To Date", key: "transactionToDate", width: 25 },
  ];

  // 👇 FIX: single object → addRow
  if (Array.isArray(data)) {
    sheet.addRows(data);
  } else {
    sheet.addRow(data);
  }

  return workbook;
};




export const companyPaymentExportHandler = async (req: Request, res: Response) => {
  const { from, to } = req.query as any;

  await assertNoPendingCorrections(from, to);

  const data = await getCompanyPaymentReport(from, to);

  const workbook = await generateCompanyPaymentExcel(data);

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );

  res.setHeader(
    'Content-Disposition',
    `attachment; filename=company-payment-${from}-${to}.xlsx`
  );

  await workbook.xlsx.write(res);
  res.end();
};