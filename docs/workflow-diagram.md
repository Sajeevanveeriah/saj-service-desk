# Core service workflow

```text
Public request
     |
     v
Triage --> Awaiting customer --reply--> Triage
     |
     v
Quote draft --> Issued --> [customer accepts exact version]
                  |                    |
             expires/declines     Approved job (once)
                                       |
                               Scheduled -> In progress
                                       |
                          blocked <----+----> customer update
                                       |
                                   Completed
                                       |
                           Invoice draft (GST guard)
                                       |
                         Issued -> pending reconciliation
                                       |
                           owner verifies payment
                                       |
                               Receipt / balance
```

Text equivalent: a request is triaged, optionally quoted, and only the exact accepted quote version creates an approved job. The job lifecycle is independent from payment. Completing work creates a guarded invoice draft; an external PayPal click or customer assertion creates only a pending reconciliation record. The owner verifies amount, date, reference and evidence before allocation and receipt. Internal notes never enter customer-visible updates.
