const options: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Tehran', hour: '2-digit', minute: '2-digit', hour12: false };
const tehran = new Intl.DateTimeFormat('en-GB', options);
const persian = new Intl.DateTimeFormat('fa-IR', options);
export const tehranClock = (stamp: string) => tehran.format(new Date(stamp));
export const persianClock = (stamp: string) => persian.format(new Date(stamp));
export const allClockTimes = Array.from({ length: 1440 }, (_, minute) => `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`);
