import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createInvoicePdf } from "../src/infrastructure/documents/invoice-pdf";

const longDescription = "Technical investigation and documented remediation covering the network path, device configuration, website delivery logs and customer-visible validation. ".repeat(8).trim();
const pdf = await createInvoicePdf({
  title: "Draft invoice",
  number: "DEMO-INV-00001",
  issueDate: "8 September 2026",
  dueDate: "22 September 2026",
  supplierName: "Sajeevan Veeriah",
  supplierAbn: "17 630 081 594",
  customerName: "Demonstration customer - not a real record",
  customerDetails: "Melbourne, Victoria",
  lines: Array.from({ length: 9 }, (_, index) => ({
    description: `${index + 1}. ${longDescription}`,
    quantity: "1",
    amount: "$110.00",
  })),
  subtotal: "$900.00",
  gst: "$90.00",
  total: "$990.00",
  amountPaid: "$400.00",
  balance: "$590.00",
  terms: "Demonstration document only. GST is shown only to inspect the draft layout. This sample is not issued and is not a tax invoice.",
  paymentReference: "DEMO-INV-00001",
});

const output = resolve(process.cwd(), "docs/20260908-Saj-Service-Desk-Invoice-Sample-Rev00.pdf");
await writeFile(output, pdf);
console.log(output);
