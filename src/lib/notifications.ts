// Browser Push Notifications Manager

export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    console.log("Browser doesn't support notifications");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
}

export function isNotificationSupported(): boolean {
  return "Notification" in window;
}

export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) {
    return "denied";
  }
  return Notification.permission;
}

interface TransactionNotificationData {
  walletAddress: string;
  amount: string;
  txHash: string;
  usdtBalance?: string;
  nativeBalance?: string;
}

export function showTransactionNotification(data: TransactionNotificationData): void {
  if (Notification.permission !== "granted") {
    return;
  }

  const notification = new Notification("🎯 New Transaction Received!", {
    body: `From: ${data.walletAddress.slice(0, 6)}...${data.walletAddress.slice(-4)}\nAmount: ${data.amount}\nUSDT Balance: ${data.usdtBalance || "N/A"}`,
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag: data.txHash,
    requireInteraction: true,
    silent: false,
  });

  notification.onclick = () => {
    window.focus();
    notification.close();
  };

  // Auto close after 10 seconds
  setTimeout(() => {
    notification.close();
  }, 10000);
}

export function showTestNotification(): void {
  if (Notification.permission !== "granted") {
    return;
  }

  const notification = new Notification("🔔 Notifications Enabled!", {
    body: "You will now receive alerts for new transactions.",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag: "test-notification",
  });

  setTimeout(() => {
    notification.close();
  }, 5000);
}
