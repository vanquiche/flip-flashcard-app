import { DateTime } from 'luxon';

const checkDate = (loginDate: string ) => {
  const dt = DateTime;
  const today = dt.now()
  const userLogin = dt.fromISO(loginDate);

  const isSameDay = today.weekday === userLogin.weekday

  return isSameDay
}

export default checkDate;