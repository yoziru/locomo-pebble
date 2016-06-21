/*
  A function that determines whether BST is currently in effect in London,
  based on the date on the user's PC, but regardless of whether the user
  is in London, or somewhere else. BST runs between the last Sunday of
  March, and the last Sunday of October, with a varying date each year.
*/
var bst = (function() {

  return {
    calculateState: calculateState
  };

  function calculateState() {
    var d = new Date();

    // Loop over the 31 days of March for the current year
    for (var i = 31; i > 0; i--) {
      var tmp = new Date(d.getFullYear(), 2, i);

      // If it's Sunday
      if (tmp.getDay() === 0) {
        // last Sunday of March
        lSoM = tmp;

        // And stop the loop
        break;
      }
    }

    // Loop over the 31 days of October for the current year
    for (var j = 31; j > 0; j--) {
      var tmp2 = new Date(d.getFullYear(), 9, j);

      // If it's Sunday
      if (tmp2.getDay() === 0) {
        // last Sunday of October
        lSoO = tmp2;

        // And stop the loop
        break;
      }
    }

    // 0 = DST off (GMT)
    // 1 = DST on  (BST)
    if (d < lSoM || d > lSoO) return false;
    else return true;
  }

}());
module.exports = bst;
