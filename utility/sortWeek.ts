import { DateTime } from 'luxon';

const sortWeek = (week: string[]) => {
  const latestLogin = week[week.length - 1];
  const dt = DateTime;

  const today = dt.now().weekday;
  const loginDay = dt.fromISO(latestLogin).weekday;
  const weekExpired = week.some((w) => {
    const { days } = dt.now().diff(dt.fromISO(w), 'days').toObject();
    return days && days >= 7 ? true : false;
  });
  const startOfNewWeek = today === 7

  if (loginDay === today) {
    // if same day then do nothing
    return week;
  } else if (weekExpired || startOfNewWeek) {
    // if login days are not in same week
    // if week have exceeded 7 logins
    // if new week has started i.e. Sunday
    return [dt.now().toISO()];
  } else return week.concat(dt.now().toISO())
};


export default sortWeek;
