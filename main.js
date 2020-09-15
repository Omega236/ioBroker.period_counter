"use strict";

/*
 * Created with @iobroker/create-adapter v1.27.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require("@iobroker/adapter-core")


const cron = require('node-cron') // Cron Schedulervar

const ObjectSettings = require('./ObjectSettings.js')

// Load your modules here, e.g.:
// const fs = require("fs");

class PeriodCounter extends utils.Adapter {

  /**
   * @param {Partial<utils.AdapterOptions>} [options={}]
   */
  constructor(options) {
    super({
      ...options,
      name: "period_counter",
    });
    this.dicDatas = {}
    this.on("ready", this.onReady.bind(this));
    this.on("stateChange", this.onStateChange.bind(this));
    this.on("objectChange", this.onObjectChange.bind(this));
    this.on("unload", this.onUnload.bind(this));
  }

  /**
   * Is called when databases are connected and adapter received configuration.
   */
  async onReady() {

    await this.initialObjects()
    this.subscribeForeignObjects('*')

    cron.schedule('0 0 * * *', async () => {
      let date = new Date()
      //New Day
      this.log.debug('Mitternacht')
      for (let oneOD in this.dicDatas) {
        //#####
        //reset Day
        //#####
        //before day
        let oS = this.dicDatas[oneOD]
        this.log.info(oneOD + " Mitternacht setze before ")
        await this._fillStateBefore(oS, "Day", oS.before_days)
        //start_day
        this.log.info(oneOD + " Mitternacht setze start_day auf  " + oS.lastGoodValue)
        oS.start_day = oS.lastGoodValue
        await this._SET_startValue(oS, "day", oS.start_day)

        //#####
        //reset week
        //#####
        if (date.getDay() == 1) { //0 = Sunday
          this.log.info(oneOD + " Wochenbeginn setze before ")
          await this._fillStateBefore(oS, "Week", oS.before_weeks)

          //start_week setzen
          this.log.info(oneOD + " Wochenbeginn setze start_week auf  " + oS.lastGoodValue)
          oS.start_week = oS.lastGoodValue
          await this._SET_startValue(oS, "week", oS.start_week)

        }
        //#####
        //reset month
        //#####
        if (date.getDate() == 1) {
          this.log.info(oneOD + " Monatsbeginn setze before ")
          await this._fillStateBefore(oS, "Month", oS.before_months)

          //start_month setzen
          this.log.info(oneOD + " Monatsbeginn setze start_month auf  " + oS.lastGoodValue)
          oS.start_month = oS.lastGoodValue
          await this._SET_startValue(oS, "month", oS.start_month)

        }
        //#####
        //reset year
        //#####
        if (date.getUTCMonth() == 0 && date.getDate() == 0) {
          this.log.info(oneOD + " Jahresbeginn setze before ")
          await this._fillStateBefore(oS, "Year", oS.before_years)

          //start_year setzen
          this.log.info(oneOD + " Monatsbeginn setze start_Year auf  " + oS.lastGoodValue)
          oS.start_year = oS.lastGoodValue
          await this._SET_startValue(oS, "year", oS.start_year)

        }

      }


      await this._Generate_AllObjects()
      await this._fillAllCurrentValues()


    })

  }

  /**
* Is called if a subscribed object changes
* @param {string} id
* @param {ioBroker.Object | null | undefined} obj
*/
  async onObjectChange(id, obj) {
    let settingsForMe = (obj && obj.common && obj.common.custom && obj.common.custom[this.namespace])
    let oldsettingsexist = (id in this.dicDatas)
    if (settingsForMe || oldsettingsexist) { await this.initialObjects() }
  }

  /**
    * Is called if a subscribed state changes
    * @param {string} id
    * @param {ioBroker.State | null | undefined} state
    */
  async onStateChange(id, state) {
    if (state) {
      if (id.startsWith(this.namespace)) {
        let idsplit = id.split(".")
        let idcounter = idsplit.slice(0, 3).join(".") + "._counterID"
        let idoS = await this.getStateAsync(idcounter)
        if (idoS) {
          let oS = this.dicDatas[idoS.val]
          if (oS) {
            let variable = idsplit.pop()
            if (variable == "start_day") {
              oS.start_day = state.val
            }
            else if (variable == "start_week") {
              oS.start_week = state.val
            }
            else if (variable == "start_month") {
              oS.start_month = state.val
            }
            else if (variable == "start_year") {
              oS.start_year = state.val
            }
            let valadsaf = await this.getForeignStateAsync(oS.id)
            if (valadsaf)
              await this._fillCurrentValues(oS, new Date(), valadsaf.val)

          }
        }

      }
      else if (this.initialfinished) {

        await this._fillCurrentValues(this.dicDatas[id], new Date(state.ts), Number(state.val))

        //this.log.debug(id + ' state changed')
      }
    }

  }

  /**
 * Is called when adapter shuts down - callback has to be called under any circumstances!
 * @param {() => void} callback
 */
  onUnload(callback) {
    try {

      // Here you must clear all timeouts or intervals that may still be active
      // clearTimeout(timeout1);
      // clearTimeout(timeout2);
      // ...
      // clearInterval(interval1);

      callback();
    } catch (e) {
      callback();
    }
  }
  /**
 * Pull the before Values one level back
 * @param {ObjectSettings} oS
 * @param {string} beforetype
 * @param {number} beforeCount
 */
  async _fillStateBefore(oS, beforetype, beforeCount) {
    //Days before befüllen
    let iBeforeCount
    for (iBeforeCount = beforeCount; iBeforeCount > 1; iBeforeCount--) {
      let theValBefore = await this.getStateAsync(oS.alias + "." + beforetype + "sBefore.Before_" + this.pad(iBeforeCount - 1, 2))
      if (theValBefore) {
        await this.setStateAsync(oS.alias + "." + beforetype + "sBefore.Before_" + this.pad(iBeforeCount, 2), Number(theValBefore.val), true)
      }
    }
    if (iBeforeCount == 1) {
      await this.setStateAsync(oS.alias + "." + beforetype + "sBefore.Before_" + this.pad(iBeforeCount, 2), oS.lastGoodValue, true)
    }
  }



  /**
  * Fills all CurrentValue for all Objects, needed on Adapter-Start and Day-change
  */
  async _fillAllCurrentValues() {
    for (let oneOD in this.dicDatas) {
      let valadsaf = await this.getForeignStateAsync(oneOD)
      if (valadsaf)
        await this._fillCurrentValues(this.dicDatas[oneOD], new Date(), valadsaf.val)

    }
  }


  /**
* calculate the current Values, needed on Adapterstart, Day-Change and ValueChange
* @param {Number} theNumber
* @returns {Number}
*/
  _roundto(theNumber) {
    return Number((theNumber).toFixed(10))
  }

  /**
  * calculate the current Values, needed on Adapterstart, Day-Change and ValueChange
  * @param {ObjectSettings} oS
  * @param {Date} date
  * @param {object} current_value
  */
  async _fillCurrentValues(oS, date, current_value) {
    //if (date.getHours() === 0 && date.getMinutes() == 0) {
    //  date = new Date(date.getMilliseconds() - date.getTime() - 1)
    //}
    current_value = this._roundto(current_value)
    if (oS.counterResetDetetion0Ignore && current_value == 0) {
      current_value = oS.lastGoodValue
      oS.was0 = true
    }


    if (oS.counterResetDetection && current_value < oS.lastGoodValue) {
      //Verringerung erkannt -> neuanpassung der startWerte
      var theAnpassung = this._roundto( oS.lastGoodValue - current_value)
      if (oS.was0) {
        theAnpassung = oS.lastGoodValue
        oS.was0 = false

      }

      this.log.warn(oS.id + " wurde scheinbar resetet! Reset von " + oS.lastGoodValue + " nach " + current_value + " passe alle Startwerte an")
      oS.lastGoodValue = current_value

      oS.start_day = this._roundto((oS.start_day - theAnpassung))
      await this._SET_startValue(oS, "day", oS.start_day)
      oS.start_week = this._roundto((oS.start_week - theAnpassung))
      await this._SET_startValue(oS, "week", oS.start_week)
      oS.start_month = this._roundto((oS.start_month - theAnpassung))
      await this._SET_startValue(oS, "month", oS.start_month)
      oS.start_year = this._roundto((oS.start_year - theAnpassung))
      await this._SET_startValue(oS, "year", oS.start_year)

    }
    oS.lastGoodValue = current_value



    let current_Day = this._roundto(this._roundto(current_value - oS.start_day) * oS.output_multiplier)
    await this.setStateAsync(oS.alias + '.Current_Day', current_Day, true)
    this._Update_DayState(oS, date, current_Day)

    let current_Week = this._roundto( this._roundto(current_value - oS.start_week) * oS.output_multiplier)
    await this.setStateAsync(oS.alias + '.Current_Week', current_Week, true)
    this._Update_WeekState(oS, date, current_Week)

    let current_Month =  this._roundto(this._roundto(current_value - oS.start_month) * oS.output_multiplier)
    await this.setStateAsync(oS.alias + '.Current_Month', current_Month, true)
    this._Update_MonthState(oS, date, current_Month)

    let current_Year =  this._roundto(this._roundto(current_value - oS.start_year) * oS.output_multiplier)
    await this.setStateAsync(oS.alias + '.Current_Year', current_Year, true)
    this._Update_YearState(oS, date, current_Year)


  }





  /**
* Is called if a subscribed object changes
* @param {ObjectSettings} oS
* @param {Date} date
* @param {any} Value
*/
  async _Update_DayState(oS, date, Value) {
    if (oS.detailed_days) {
      await this.setStateAsync(oS.alias + "." + date.getFullYear() + ".Days." + this.pad(date.getMonth() + 1, 2) + "_" + date.toLocaleString('en-us', { month: 'long' }) + "." + this.pad(date.getDate(), 2), Value, true)
    }
  }

  /**
  * Is called if a subscribed object changes
  * @param {ObjectSettings} oS
  * @param {Date} date
  * @param {any} Value
  */
  async _Update_MonthState(oS, date, Value) {
    if (oS.detailed_months) {

      let MonthString = date.toLocaleString('en-us', { month: 'long' })
      await this.setStateAsync(oS.alias + "." + date.getFullYear() + ".Months" + "." + this.pad(date.getMonth() + 1, 2) + "_" + MonthString, Value, true)
    }
  }

  /**
* Is called if a subscribed object changes
* @param {ObjectSettings} oS
* @param {Date} date
* @param {any} Value
*/
  async _Update_WeekState(oS, date, Value) {
    if (oS.detailed_weeks) {
      await this.setStateAsync(oS.alias + "." + date.getFullYear() + ".Weeks" + ".KW" + this.pad(this._Get_KW(date), 2), Value, true)
    }
  }

  /**
  * Is called if a subscribed object changes
  * @param {ObjectSettings} oS
  * @param {Date} date
  * @param {any} Value
  */
  async _Update_YearState(oS, date, Value) {
    if (oS.detailed_years) {
      await this.setStateAsync(oS.alias + "." + date.getFullYear() + ".Value", Value, true)

    }
  }

  /**
 * returns the KW of the date
 * @param {Date} date
 */
  _Get_KW(date) {
    // Copy date so don't modify original
    let d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    d.setHours(0, 0, 0, 0);
    // Thursday in current week decides the year.
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    // January 4 is always in week 1.
    var week1 = new Date(d.getFullYear(), 0, 4);
    // Adjust to Thursday in week 1 and count number of weeks from date to week1.
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000
      - 3 + (week1.getDay() + 6) % 7) / 7);

  }





  /**
    * create for every enabled object the needed stats and set it to initial it
    */
  async initialObjects() {
    this.initialfinished = false
    this.log.info('inital all Objects')

    // all unsubscripe to begin completly new
    this.unsubscribeForeignStates('*')
    // delete all dics
    this.dicDatas = {}
    // read out all Objects
    let objects = await this.getForeignObjectsAsync('')
    for (let idobject in objects) {
      let iobrokerObject = objects[idobject]
      // only do something when enabled 
      if (iobrokerObject && iobrokerObject.common && iobrokerObject.common.custom && iobrokerObject.common.custom[this.namespace] && iobrokerObject.common.custom[this.namespace].enabled) {
        this.log.info('initial (enabled ): ' + iobrokerObject._id)
        var oS = new ObjectSettings(iobrokerObject, this.namespace)
        await this._SET_CreateObject(oS.alias + "._counterID", oS.alias + " id", "", "")
        await this.setStateAsync(oS.alias + "._counterID", oS.id, true)
        this.dicDatas[oS.id] = oS

        let currentvalue = await this.getForeignStateAsync(oS.id)

        var currentVal = 0
        if (currentvalue && currentvalue.val && Number(currentvalue.val) != Number.NaN) {
          currentVal = Number(currentvalue.val)

        }
        await this.createChannelAsync(oS.alias, "_startValues")
        this.subscribeStates(oS.alias + "._startValues.*")

        oS.start_day = Number(await this._GET_ReadOutStartValueAndCreateIfNotExists(oS, "day", currentVal))
        oS.start_week = Number(await this._GET_ReadOutStartValueAndCreateIfNotExists(oS, "week", currentVal))
        oS.start_month = Number(await this._GET_ReadOutStartValueAndCreateIfNotExists(oS, "month", currentVal))
        oS.start_year = Number(await this._GET_ReadOutStartValueAndCreateIfNotExists(oS, "year", currentVal))


        if (currentvalue) {
          if (oS.counterResetDetetion0Ignore && currentvalue.val == 0) {
            oS.lastGoodValue = oS.start_day
          }
          else {
            oS.lastGoodValue = Number(currentvalue.val)
          }
        }


        this.log.debug('subscribeForeignStates ' + oS.id)
        await this.subscribeForeignStatesAsync(oS.id)
        this.log.debug('initial done ' + iobrokerObject._id)
      }
    }
    await this._Generate_AllObjects()
    await this._fillAllCurrentValues()

    this.log.info('initial completed')
    this.initialfinished = true
  }

  /**
  * create for every enabled object the needed current, history and before Datapoints
 */
  async _Generate_AllObjects() {
    for (let oneOD in this.dicDatas) {
      let oS = this.dicDatas[oneOD]
      await this._SET_CreateChannel(oS.alias, 'CounterData for ' + oS.id, false)
      await this._SET_CreateObject(oS.alias + ".Current_Day", "Current Day", "value.Current.Day", oS.output_unit)
      await this._SET_CreateObject(oS.alias + ".Current_Week", "Current Week", "value.Current.Week", oS.output_unit)
      await this._SET_CreateObject(oS.alias + ".Current_Month", "Current Month", "value.Current.Month", oS.output_unit)
      await this._SET_CreateObject(oS.alias + ".Current_Year", "Current Year", "value.Current.Year", oS.output_unit)

      let i
      for (i = 0; i < this.config.generateDPDays; i++) {
        let dat = new Date()
        dat.setDate(dat.getDate() + i)
        await this._Generate_HistoryDatapoints(oS, dat)
      }

      //Before erzeugen bzw leeren
      await this._generate_BeforeObject(oS, "Day", oS.before_days)
      await this._generate_BeforeObject(oS, "Week", oS.before_weeks)
      await this._generate_BeforeObject(oS, "Month", oS.before_months)
      await this._generate_BeforeObject(oS, "Year", oS.before_years)


    }
  }

  /**
* Adds 0 to numbers
* @param {number} num
* @param {number} size
*/
  pad(num, size) {
    var s = num + "";
    while (s.length < size) s = "0" + s
    return s
  }

  /**
* create for every enabled object the needed stats and set it to initial it
* @param {ObjectSettings} oS
* @param {string} beforeType
* @param {number} beforeCount
*/
  async _generate_BeforeObject(oS, beforeType, beforeCount) {
    let iBefore
    for (iBefore = 1; iBefore <= beforeCount; iBefore++) {
      await this._SET_CreateChannel(oS.alias + "." + beforeType + "sBefore", beforeType + "s Before", true)
      let theDateInfo = ""
      let theDate = new Date()
      if (beforeType == "Day") {
        theDate.setDate(theDate.getDate() - iBefore)
        theDateInfo = theDate.toDateString()
      } else if (beforeType == "Week") {
        theDate.setDate(theDate.getDate() - 7 * iBefore)
        theDateInfo = "KW_" + this._Get_KW(theDate)
      }
      else if (beforeType == "Month") {
        theDate.setMonth(theDate.getMonth() - iBefore)
        let MonthString = theDate.toLocaleString('en-us', { month: 'long' })
        theDateInfo = this.pad(theDate.getMonth() + 1, 2) + "_" + MonthString
      }
      else if (beforeType == "Year") {
        theDate.setFullYear(theDate.getFullYear() - iBefore)

        theDateInfo = theDate.getFullYear().toString()
      }

      await this._SET_ExtendObject(oS.alias + "." + beforeType + "sBefore.Before_" + this.pad(iBefore, 2), "actually " + theDateInfo, 'value.history', oS.output_unit)
    }
    while (true) {
      if (await this.getObjectAsync(oS.alias + "." + beforeType + "sBefore.Before_" + this.pad(iBefore, 2))) {
        await this._SET_ExtendObject(oS.alias + "." + beforeType + "sBefore.Before_" + this.pad(iBefore, 2), "actually disabled", 'value.history', oS.output_unit)
        await this.setStateAsync(oS.alias + "." + beforeType + "sBefore.Before_" + this.pad(iBefore, 2), null, true)
        iBefore++
      }
      else { break }

    }
  }

  /**
  * create the HistoryDatapoints for this Day
  * @param {ObjectSettings} oS
  * @param {Date} date
  */
  async _Generate_HistoryDatapoints(oS, date) {
    if (oS.detailed_days) {
      let ID_Year = oS.alias + "." + date.getFullYear()
      await this._SET_CreateChannel(ID_Year, String(date.getFullYear()), true)
      let ID_Days = ID_Year + ".Days"
      await this._SET_CreateChannel(ID_Days, "Days", true)
      let MonthString = date.toLocaleString('en-us', { month: 'long' })
      let ID_Months = ID_Days + "." + this.pad(date.getMonth() + 1, 2) + "_" + MonthString
      await this._SET_CreateChannel(ID_Months, this.pad(date.getMonth() + 1, 2) + "_" + MonthString, true)
      let ID_Day = ID_Months + "." + this.pad(date.getDate(), 2)
      await this._SET_CreateObject(ID_Day, this.pad(date.getDate(), 2) + ". " + MonthString, "value.history", oS.output_unit)
    }
    if (oS.detailed_months) {
      let ID_Year = oS.alias + "." + date.getFullYear()
      await this._SET_CreateChannel(ID_Year, String(date.getFullYear()), true)
      let ID_Months = ID_Year + ".Months"
      await this._SET_CreateChannel(ID_Months, "Months", true)
      let MonthString = date.toLocaleString('en-us', { month: 'long' })
      let ID_Month = ID_Months + "." + this.pad(date.getMonth() + 1, 2) + "_" + MonthString
      await this._SET_CreateObject(ID_Month, this.pad(date.getMonth() + 1, 2) + "_ " + MonthString, 'value.history', oS.output_unit)
    }
    if (oS.detailed_weeks) {
      let ID_Year = oS.alias + "." + date.getFullYear()
      await this._SET_CreateChannel(ID_Year, String(date.getFullYear()), true)
      let ID_Weeks = ID_Year + ".Weeks"
      await this._SET_CreateChannel(ID_Weeks, "Weeks", true)
      let ID_Months = ID_Weeks + ".KW" + this.pad(this._Get_KW(date), 2)
      await this._SET_CreateObject(ID_Months, "KW" + this.pad(this._Get_KW(date), 2), "value.history", oS.output_unit)
    }
    if (oS.detailed_years) {
      let ID_Year = oS.alias + "." + date.getFullYear()
      await this._SET_CreateChannel(ID_Year, String(date.getFullYear()), true)
      let ID_YearV = ID_Year + ".Value"
      await this._SET_CreateObject(ID_YearV, date.getFullYear() + " Value", 'value.history', oS.output_unit)
    }
  }


  /**
* Extends an existing object or create it
* @param {string} id
* @param {string} name
* @param {string} role
* @param {string} unit
*/
  async _SET_ExtendObject(id, name, role, unit) {
    await this.extendObjectAsync(id, {
      type: 'state',
      common: {
        name: name,
        role: role,
        type: 'number',
        desc: `Created by ${this.namespace}`,
        unit: unit,
        read: true,
        write: false,
      },
      native: {}
    })
  }
  /**
   * Is called if a subscribed object changes
    * @param {string} id
  * @param {string} name
  *  * @param {boolean} history
   */
  async _SET_CreateChannel(id, name, history) {
    await this.setObjectNotExists(id, {
      type: 'channel',
      common: {
        name: name,
        role: history ? "value.history" : "value.current",
        desc: `Created by ${this.namespace}`,
      },
      native: {}
    })

  }
  /**
* Create new Object in self tree
* @param {string} id
* @param {string} name
* @param {string} role
* @param {string} unit
*/
  async _SET_CreateObject(id, name, role, unit) {
    await this.setObjectNotExistsAsync(id, {
      type: 'state',
      common: {
        name: name,
        role: role,
        type: 'number',
        desc: `Created by ${this.namespace}`,
        unit: unit,
        read: true,
        write: false,
      },
      native: {}
    })
  }

  /**
* extends the Object with customData in the correct namespace
* @param {ObjectSettings} oS
* @param {string} type
* @param {object} value
*/
  async _SET_startValue(oS, type, value) {
    await this.setStateAsync(oS.alias + "._startValues.start_" + type, value, true)
  }
  /**
* extends the Object with customData in the correct namespace
* @param {ObjectSettings} oS
* @param {string} type
* @param {object} value
*/
  async _GET_ReadOutStartValueAndCreateIfNotExists(oS, type, value) {
    await this._SET_CreateObject(oS.alias + "._startValues.start_" + type, "start_" + type, "", "")

    let state = await this.getStateAsync(oS.alias + "._startValues.start_" + type)
    if (!state || state.val == null || state.val == undefined) {
      await this.setStateAsync(oS.alias + "._startValues.start_" + type, value, true)
      state = await this.getStateAsync(oS.alias + "._startValues.start_" + type)
    }
    if (state) {
      return state.val
    }
  }
}


// @ts-ignore parent is a valid property on module
if (module.parent) {
  // Export the constructor in compact mode
  /**
   * @param {Partial<utils.AdapterOptions>} [options={}]
   */
  module.exports = (options) => new PeriodCounter(options);
} else {
  // otherwise start the instance directly
  new PeriodCounter();
}