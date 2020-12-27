class ObjectSettings {
  /**
  * Generate new ObjectSettingsClass
  * @param {string} namespace
  * @param {ioBroker.Object } iobrokerObject
  */
  constructor (iobrokerObject, namespace) {
    let abc = {}
    if ( iobrokerObject.common.custom)
    {
      abc = iobrokerObject.common.custom[namespace]
    }
    this.id = iobrokerObject._id
    this.iobrokerObject = iobrokerObject

    this.alias = abc.alias

    if (this.alias == undefined || this.alias === "")    {
      this.alias = iobrokerObject._id.replace(/[.]/g, '_')
    }
    this.output_unit = abc.output_unit
    if (this.output_unit === null || this.output_unit === "" || this.output_unit == undefined)    {
      this.output_unit = iobrokerObject.common.unit
    }
    this.output_multiplier = abc.output_multiplier,
    this.detailed_Minutes = false,
    this.detailed_Hours = false,
    this.detailed_Days = abc.detailed_days,
    this.detailed_Weeks = abc.detailed_weeks,
    this.detailed_Months = abc.detailed_months,
    this.detailed_Quarters = abc.detailed_quarters,
    this.detailed_Years = abc.detailed_years,
    this.before_Minutes = abc.before_minutes,
    this.before_Hours = abc.before_hours,
    this.before_Days = abc.before_days,
    this.before_Weeks = abc.before_weeks,
    this.before_Months = abc.before_months,
    this.before_Quarters = abc.before_quarters,
    this.before_Years = abc.before_years,
    this.lastGoodValue = 0
    this.FirstWrongValue = Number.NaN
    this.lastWrongValue = NaN
    


    this.counterResetDetection = abc.counterResetDetection

    //this.counterResetDetetion0Ignore = abc.counterResetDetetion0Ignore
    this.counterResetDetetion_CountAfterReset = abc.counterResetDetetion_CountAfterReset
    this.counterResetDetetion_CurrentCountAfterReset = 0



    
    
  }
}
module.exports = ObjectSettings