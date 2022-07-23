// Funny name, but it stands for noFirstTime

export default function noFirstTime(fn, returnValue) {
    let isFirstTime = true;
    return function (...args) {
      if (isFirstTime) {
        isFirstTime = false;
        return returnValue;
      }

      return fn(...args)
    }
  }