interface MoveData {
  userName: string;
  partId: string;
  partName: string;
  locationId: string;
  deltaQty: number;
  reason: string | null;
  note: string | null;
  ts: string;
}

interface MovesByUser {
  [userName: string]: MoveData[];
}

export function generateDailySummaryEmail(
  date: string,
  moves: MoveData[],
  totalPulls: number,
  totalReturns: number
): string {
  // Group moves by user
  const movesByUser: MovesByUser = {};
  for (const move of moves) {
    if (!movesByUser[move.userName]) {
      movesByUser[move.userName] = [];
    }
    movesByUser[move.userName].push(move);
  }

  const userSections = Object.entries(movesByUser)
    .map(([userName, userMoves]) => {
      const userPulls = userMoves.filter((m) => m.deltaQty < 0).length;
      const userReturns = userMoves.filter((m) => m.deltaQty > 0).length;

      const moveRows = userMoves
        .map((move) => {
          const action = move.deltaQty < 0 ? "Pull" : "Return";
          const qty = Math.abs(move.deltaQty);
          const time = new Date(move.ts).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          });

          return `
            <tr>
              <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${time}</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">
                <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; background-color: ${action === "Pull" ? "#fee2e2" : "#dcfce7"}; color: ${action === "Pull" ? "#991b1b" : "#166534"};">
                  ${action}
                </span>
              </td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${qty}</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">
                <strong>${move.partId}</strong><br/>
                <span style="font-size: 13px; color: #666;">${move.partName}</span>
              </td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${move.locationId}</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 13px; color: #666;">
                ${move.reason || "-"}${move.note ? `<br/>${move.note}` : ""}
              </td>
            </tr>
          `;
        })
        .join("");

      return `
        <div style="margin-bottom: 32px;">
          <div style="background-color: #f5f5f4; padding: 12px 16px; border-radius: 8px 8px 0 0; border: 1px solid #e5e5e4; border-bottom: none;">
            <h3 style="margin: 0; font-size: 16px; color: #292524;">${userName}</h3>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #78716c;">
              ${userPulls} pull${userPulls !== 1 ? "s" : ""}, ${userReturns} return${userReturns !== 1 ? "s" : ""}
            </p>
          </div>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e5e4; border-top: none; border-radius: 0 0 8px 8px; overflow: hidden;">
            <thead>
              <tr style="background-color: #fafaf9;">
                <th style="padding: 8px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #78716c; text-transform: uppercase;">Time</th>
                <th style="padding: 8px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #78716c; text-transform: uppercase;">Action</th>
                <th style="padding: 8px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #78716c; text-transform: uppercase;">Qty</th>
                <th style="padding: 8px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #78716c; text-transform: uppercase;">Part</th>
                <th style="padding: 8px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #78716c; text-transform: uppercase;">Location</th>
                <th style="padding: 8px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #78716c; text-transform: uppercase;">Notes</th>
              </tr>
            </thead>
            <tbody>
              ${moveRows}
            </tbody>
          </table>
        </div>
      `;
    })
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f4;">
      <div style="max-width: 800px; margin: 0 auto; padding: 24px;">
        <!-- Header -->
        <div style="background-color: #292524; color: white; padding: 24px; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 600;">Daily Inventory Summary</h1>
          <p style="margin: 8px 0 0 0; color: #a8a29e;">${date}</p>
        </div>

        <!-- Stats -->
        <div style="background-color: white; padding: 24px; border-left: 1px solid #e5e5e4; border-right: 1px solid #e5e5e4;">
          <div style="display: flex; gap: 24px;">
            <div style="flex: 1; text-align: center; padding: 16px; background-color: #fef2f2; border-radius: 8px;">
              <div style="font-size: 32px; font-weight: 700; color: #991b1b;">${totalPulls}</div>
              <div style="font-size: 14px; color: #78716c;">Total Pulls</div>
            </div>
            <div style="flex: 1; text-align: center; padding: 16px; background-color: #f0fdf4; border-radius: 8px;">
              <div style="font-size: 32px; font-weight: 700; color: #166534;">${totalReturns}</div>
              <div style="font-size: 14px; color: #78716c;">Total Returns</div>
            </div>
            <div style="flex: 1; text-align: center; padding: 16px; background-color: #fafaf9; border-radius: 8px;">
              <div style="font-size: 32px; font-weight: 700; color: #292524;">${moves.length}</div>
              <div style="font-size: 14px; color: #78716c;">Total Moves</div>
            </div>
          </div>
        </div>

        <!-- Moves by User -->
        <div style="background-color: white; padding: 24px; border: 1px solid #e5e5e4; border-top: none; border-radius: 0 0 12px 12px;">
          <h2 style="margin: 0 0 24px 0; font-size: 18px; color: #292524;">Activity by User</h2>
          ${userSections || '<p style="color: #78716c; text-align: center; padding: 32px;">No inventory moves today.</p>'}
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding: 24px; color: #78716c; font-size: 13px;">
          <p style="margin: 0;">Shop Inventory System</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function generateNoActivityEmail(date: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f4;">
      <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
        <!-- Header -->
        <div style="background-color: #292524; color: white; padding: 24px; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 600;">Daily Inventory Summary</h1>
          <p style="margin: 8px 0 0 0; color: #a8a29e;">${date}</p>
        </div>

        <!-- Content -->
        <div style="background-color: white; padding: 48px 24px; border: 1px solid #e5e5e4; border-top: none; border-radius: 0 0 12px 12px; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 16px;">-</div>
          <h2 style="margin: 0 0 8px 0; font-size: 20px; color: #292524;">No Activity Today</h2>
          <p style="margin: 0; color: #78716c;">There were no inventory moves recorded for this date.</p>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding: 24px; color: #78716c; font-size: 13px;">
          <p style="margin: 0;">Shop Inventory System</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
