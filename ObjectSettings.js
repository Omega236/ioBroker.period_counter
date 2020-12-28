class ObjectSettings {
  /**
  * Generate new ObjectSettingsClass
  * @param {string} namespace
  * @param {ioBroker.Object } iobrokerObject
  */
  constructor(iobrokerObject, namespace) {
    let myCustomSettings;
    if (iobrokerObject.common.custom) {
      myCustomSettings = iobrokerObject.common.custom[namespace]
    }
    this.id = iobrokerObject._id
    this.iobrokerObject = iobrokerObject

    this.alias = myCustomSettings.alias

    if (this.alias == undefined || this.alias === "") {
      this.alias = iobrokerObject._id.replace(/[.]/g, '_')
    }
    this.output_unit = myCustomSettings.output_unit
    if (this.output_unit === null || this.output_unit === "" || this.output_unit == undefined) {
      this.output_unit = iobrokerObject.common.unit
    }
    this.output_multiplier = myCustomSettings.output_multiplier,
      this.detailed_Minutes = false,
      this.detailed_Hours = false,
      this.detailed_Days = myCustomSettings.detailed_days,
      this.detailed_Weeks = myCustomSettings.detailed_weeks,
      this.detailed_Months = myCustomSettings.detailed_months,
      this.detailed_Quarters = myCustomSettings.detailed_quarters,
      this.detailed_Years = myCustomSettings.detailed_years,
      this.before_Minutes = myCustomSettings.before_minutes,
      this.before_Hours = myCustomSettings.before_hours,
      this.before_Days = myCustomSettings.before_days,
      this.before_Weeks = myCustomSettings.before_weeks,
      this.before_Months = myCustomSettings.before_months,
      this.before_Quarters = myCustomSettings.before_quarters,
      this.before_Years = myCustomSettings.before_years,
      this.lastGoodValue = 0
    this.FirstWrongValue = Number.NaN
    this.lastWrongValue = NaN



    this.counterResetDetection = myCustomSettings.counterResetDetection

    //this.counterResetDetetion0Ignore = abc.counterResetDetetion0Ignore
    this.counterResetDetetion_CountAfterReset = myCustomSettings.counterResetDetetion_CountAfterReset
    this.counterResetDetetion_CurrentCountAfterReset = 0





  }

    /**
* returns the 
* @param {string} beforetype
* @returns {boolean}
*/
detailed(beforetype) {
  return this["detailed_" + beforetype + "s"]
 }

  /**
* returns the Count of Current/Previous Datapoints
* @param {string} beforetype
* @returns {number}
*/
  beforeCount(beforetype) {
   return this["before_" + beforetype + "s"]
  }
}
module.exports = ObjectSettings