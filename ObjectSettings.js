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
    this.detailed_days = abc.detailed_days,
    this.detailed_weeks = abc.detailed_weeks,
    this.detailed_months = abc.detailed_months,
    this.detailed_years = abc.detailed_years,
    this.before_days = abc.before_days,
    this.before_weeks = abc.before_weeks,
    this.before_months = abc.before_months,
    this.before_years = abc.before_years,
    this.start_day = abc.start_day,
    this.start_week = abc.start_week,
    this.start_month = abc.start_month,
    this.start_year = abc.start_year


    this.lastGoodValue = 0
    this.was0 = false
    
  }
}
module.exports = ObjectSettings