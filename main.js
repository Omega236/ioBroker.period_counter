"use strict";

/*
 * Created with @iobroker/create-adapter v1.27.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require("@iobroker/adapter-core")

const cron = require('node-cron') // Cron Schedulervar

const ObjectSettings = require('./ObjectSettings.js')

const TimePeriods = {
  Minute: 'Minute',
  Hour: 'Hour',
  Day: 'Day',
  Week: 'Week',
  Month: 'Month',
  Quarter: 'Quarter',
  Year: 'Year'
}


const TimePeriodsZahl = {
  Minute: "001",
  Hour: "002",
  Day: "01",
  Week: "02",
  Month: "03",
  Quarter: "04",
  Year: "05"
}

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
    this.on('message', this.onMessage.bind(this));
  }



  /**
   * Is called when databases are connected and adapter received configuration.
   */
  async onReady() {

    await this.initialObjects()
    this.subscribeForeignObjects('*')

    cron.schedule('* * * * *', async () => {
      let date = new Date()
      for (let oneOD in this.dicDatas) {

        let oS = this.dicDatas[oneOD]
        //New Minute

        this.log.info(oneOD + " MinutenWechsel setze before ")
        await this._fillPreviousStates(oS, TimePeriods.Minute)
        //start_minute
        this.log.info(oneOD + " MinutenWechsel setze start_minute auf  " + oS.lastGoodValue)
        await this._SET_startValue(oS, TimePeriods.Minute, oS.lastGoodValue)
        await this.setCurrentValue(oS, oS.lastGoodValue,  TimePeriods.Minute, date)


        if (date.getMinutes() == 0)
        {
          //#####
          //reset Hour
          //#####
          //before houre
          this.log.info(oneOD + " Stundenwechsel setze before ")
          await this._fillPreviousStates(oS, TimePeriods.Hour)
          //start_Hour
          this.log.info(oneOD + " Stundenwechsel setze start_hour auf  " + oS.lastGoodValue)
          await this._SET_startValue(oS, TimePeriods.Hour, oS.lastGoodValue)
          await this.setCurrentValue(oS, oS.lastGoodValue,  TimePeriods.Hour, date)

        }

        if (date.getHours() == 0 && date.getMinutes() == 0) {
          this.log.debug('Mitternacht')

          //#####
          //reset Day
          //#####
          //before day
          this.log.info(oneOD + " Mitternacht setze before ")
          await this._fillPreviousStates(oS, TimePeriods.Day)
          //start_day
          this.log.info(oneOD + " Mitternacht setze start_day auf  " + oS.lastGoodValue)
          await this._SET_startValue(oS, TimePeriods.Day, oS.lastGoodValue)
          await this.setCurrentValue(oS, oS.lastGoodValue,  TimePeriods.Day, date)

          //#####
          //reset week
          //#####
          if (date.getDay() == 1) { //0 = Sunday
            this.log.info(oneOD + " Wochenbeginn setze before ")
            await this._fillPreviousStates(oS, TimePeriods.Week)

            //start_week setzen
            this.log.info(oneOD + " Wochenbeginn setze start_week auf  " + oS.lastGoodValue)
            await this._SET_startValue(oS, TimePeriods.Week, oS.lastGoodValue)
            await this.setCurrentValue(oS, oS.lastGoodValue,  TimePeriods.Week, date)

          }
          //#####
          //reset month
          //#####
          if (date.getDate() == 1) {
            this.log.info(oneOD + " Monatsbeginn setze before ")
            await this._fillPreviousStates(oS, TimePeriods.Month)

            //start_month setzen
            this.log.info(oneOD + " Monatsbeginn setze start_month auf  " + oS.lastGoodValue)
            await this._SET_startValue(oS, TimePeriods.Month, oS.lastGoodValue)
            await this.setCurrentValue(oS, oS.lastGoodValue,  TimePeriods.Month, date)

          }

          //#####
          //reset quarter
          //#####
          if (date.getDate() == 1 && (date.getMonth() % 3) == 0) {
            this.log.info(oneOD + " QuarterBeginn setze before ")
            await this._fillPreviousStates(oS, TimePeriods.Quarter)

            //start_quarter setzen
            this.log.info(oneOD + " QuarterBeginn setze start_quarter auf  " + oS.lastGoodValue)
            await this._SET_startValue(oS, TimePeriods.Quarter, oS.lastGoodValue)
            await this.setCurrentValue(oS, oS.lastGoodValue,  TimePeriods.Quarter, date)

          }


          //#####
          //reset year
          //#####
          if (date.getMonth() == 0 && date.getDate() == 1) {
            this.log.info(oneOD + " Jahresbeginn setze before ")
            await this._fillPreviousStates(oS, TimePeriods.Year)

            //start_year setzen
            this.log.info(oneOD + " Monatsbeginn setze start_Year auf  " + oS.lastGoodValue)
            await this._SET_startValue(oS, TimePeriods.Year, oS.lastGoodValue)
            await this.setCurrentValue(oS, oS.lastGoodValue,  TimePeriods.Year, date)

          }
          //await this._Generate_AllObjects()


        }
      }



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
 */
  async _fillPreviousStates(oS, beforetype) {
    //Days before befüllen
    let beforeCount = oS['before_' + beforetype + 's']
    let iBeforeCount
    for (iBeforeCount = beforeCount; iBeforeCount > 1; iBeforeCount--) {
      let theValBefore = await this.getStateAsync(oS.alias + await this._GET_ObjectID_previous(oS, beforetype, iBeforeCount -1))
      let theObjectBefore = await this.getObjectAsync(oS.alias + await this._GET_ObjectID_previous(oS, beforetype, iBeforeCount -1))
      if (theValBefore  && theObjectBefore) {
        await this.setStateAsync(oS.alias + await this._GET_ObjectID_previous(oS, beforetype, iBeforeCount), Number(theValBefore.val), true)
        await this._SET_ExtendObject(oS, await this._GET_ObjectID_previous(oS, beforetype, iBeforeCount), theObjectBefore.common.name, 'value.history')
      }
    }
    if (iBeforeCount == 1) {
      let current_timeper = this._roundto(this._roundto(oS.lastGoodValue - await this._Get_StartValue(oS, beforetype, oS.lastGoodValue)) * oS.output_multiplier)

      await this.setStateAsync(oS.alias + await this._GET_ObjectID_previous(oS, beforetype, iBeforeCount), current_timeper, true)
      await this._SET_ExtendObject(oS, await this._GET_ObjectID_previous(oS, beforetype, iBeforeCount), await this._GET_ObjectID_DateInfoName_previous(oS, beforetype, new Date, 1),  'value.history')

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
    if (theNumber)
      return Number((theNumber).toFixed(10))
    else
      return 0
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



    if (oS.counterResetDetection && current_value < oS.lastGoodValue) {
      //Verringerung erkannt -> neuanpassung der startWerte
      if (Number.isNaN(oS.FirstWrongValue)) {
        oS.FirstWrongValue = current_value
        oS.counterResetDetetion_CurrentCountAfterReset = 0
      }
      if (oS.lastWrongValue != current_value) {
        oS.counterResetDetetion_CurrentCountAfterReset += 1
        oS.lastWrongValue = current_value
      }
      if (oS.counterResetDetetion_CurrentCountAfterReset < oS.counterResetDetetion_CountAfterReset) {
        return

      }

      var theAnpassung = this._roundto(oS.lastGoodValue - oS.FirstWrongValue)


      this.log.warn(oS.id + " wurde scheinbar resetet! Reset von " + oS.lastGoodValue + " nach " + current_value + " passe alle Startwerte an")
      oS.lastGoodValue = current_value
      oS.lastWrongValue = NaN
      oS.FirstWrongValue = NaN
      oS.counterResetDetetion_CurrentCountAfterReset = 0
      
      await [TimePeriods.Minute, TimePeriods.Hour, TimePeriods.Day, TimePeriods.Month, TimePeriods.Week, TimePeriods.Quarter, TimePeriods.Year].forEach(async TimePeriod => {
        await this._SET_startValue(oS, TimePeriod, (await this._Get_StartValue(oS, TimePeriod, current_value) - theAnpassung))
      })

 

    }
    oS.lastGoodValue = current_value
    await [TimePeriods.Minute, TimePeriods.Hour, TimePeriods.Day, TimePeriods.Month, TimePeriods.Week, TimePeriods.Quarter, TimePeriods.Year].forEach(async TimePeriod => {
      await this.setCurrentValue(oS, current_value,  TimePeriod, date)
    })

  }

   /**
* 
* @param {ObjectSettings} oS
* @param {string} type
* @param {Date} date
*/
async setCurrentValue( oS, current_value,  type, date) {
  let current_timeper = this._roundto(this._roundto(current_value - await this._Get_StartValue(oS, type, current_value)) * oS.output_multiplier)
  if (oS['before_' + type + 's'] >= 0)
  {
      await this.setStateAsync( oS.alias + await this._GET_ObjectID_Current( type), current_timeper, true)
  }

  if (oS['detailed_' + type + 's'] === true){
    let id = oS.alias +  await this._GET_ObjectID_Detailed(oS, type, date)
    let val = current_timeper
    await this.setStateAsync(id, val , true)
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
 * returns the KW of the date
 * @param {Date} date
 */
_Get_Quarter(date) {
   return Math.ceil((date.getMonth() + 1) / 3)

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
        await this._SET_ExtendObject(oS, "._counterID", " ObjectID ", "")
        await this.setStateAsync(oS.alias + "._counterID", oS.id, true)
        this.dicDatas[oS.id] = oS

        let currentvalue = await this.getForeignStateAsync(oS.id)

        var currentVal = 0
        if (currentvalue && currentvalue.val && Number(currentvalue.val) != Number.NaN) {
          currentVal = Number(currentvalue.val)

        }
        await this.createChannelAsync(oS.alias, "_startValues")
        this.subscribeStates(oS.alias + "._startValues.*")

        await this._Get_StartValue(oS, TimePeriods.Minute, currentVal)
        await this._Get_StartValue(oS, TimePeriods.Hour, currentVal)
        await this._Get_StartValue(oS, TimePeriods.Day, currentVal)
        await this._Get_StartValue(oS, TimePeriods.Week, currentVal)
        await this._Get_StartValue(oS, TimePeriods.Month, currentVal)
        await this._Get_StartValue(oS, TimePeriods.Quarter, currentVal)
        await this._Get_StartValue(oS, TimePeriods.Year, currentVal)


        if (currentvalue) {
          if (currentvalue.val && currentvalue.val < await this._Get_StartValue(oS, TimePeriods.Day, currentVal)) {
            oS.lastGoodValue = await this._Get_StartValue(oS, TimePeriods.Day, currentVal)
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
      await this._SET_ExtendChannel(oS, "", 'CounterData for ' + oS.id,)
      await [TimePeriods.Minute, TimePeriods.Hour, TimePeriods.Day, TimePeriods.Month, TimePeriods.Week, TimePeriods.Quarter, TimePeriods.Year].forEach(async beforeType => {
        if (oS['before_' + beforeType + "s"] >= 0){
          await this._SET_ExtendObject(oS, await this._GET_ObjectID_Current( beforeType), "Current " + beforeType, "value.Current." + beforeType)
        }
        else {
          if (await this.getObjectAsync(oS.alias + await this._GET_ObjectID_Current(beforeType)) != null)
          {
            await this._SET_ExtendObject(oS, await this._GET_ObjectID_Current( beforeType), "Disabled", "value.Current." + beforeType)
          }
       
        }
              //Before erzeugen bzw leeren
        await this._generate_PreviousObjects(oS, beforeType)

      })
  




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
*/
  async _generate_PreviousObjects(oS, beforeType) {
    let beforeCount = oS["before_" + beforeType + "s"]
    let iBefore;
    for (iBefore = 1; iBefore <= beforeCount; iBefore++) {
      if (!await this.getObjectAsync(oS.alias + await this._GET_ObjectID_previous(oS, beforeType, iBefore ))) {
        await this._SET_ExtendObject(oS, await this._GET_ObjectID_previous(oS, beforeType, iBefore ), "no data yet", "value.history")
      }
    }
    while (true) {
      if (await this.getObjectAsync(oS.alias + await this._GET_ObjectID_previous(oS, beforeType, iBefore))) {
        await this._SET_ExtendObject(oS, await this._GET_ObjectID_previous(oS, beforeType, iBefore ), "Disabled", "value.history")
        iBefore++
      }
      else { break }

    }
  }




  /**
* Extends an existing object or create it
* @param {ObjectSettings} oS
* @param {string} id
* @param {string} name
* @param {string} role
*/
  async _SET_ExtendObject(oS, id, name, role) {
    if (!name.includes(" (" + oS.alias + ")")){
      name += " (" + oS.alias + ")"
    }

    let theObject =  await this.getObjectAsync(oS.alias + id)

    if (theObject == null || theObject == undefined || theObject.common.name != name || theObject.common.role != role){
      await this.extendObjectAsync(oS.alias + id, {
        type: 'state',
        common: {
          name: name ,
          role: role,
          type: 'number',
          desc: `Created by ${this.namespace}`,
          unit: oS.output_unit,
          read: true,
          write: false,
        },
        native: {}
      })
    }



  }
  /**
   * Is called if a subscribed object changes
  * @param {ObjectSettings} oS
  * @param {string} id
  * @param {string} name
   */
  async _SET_ExtendChannel(oS, id, name) {

    let theObject =  await this.getObjectAsync(oS.alias + id)
    if (theObject == null || theObject == undefined || theObject.common.name != name + " (" + oS.alias + ")" || theObject.type != "channel" ){
      await this.extendObjectAsync(oS.alias + id, {
        type: 'channel',
        common: {
          name: name + " (" + oS.alias + ")",
          desc: `Created by ${this.namespace}`,
        },
        native: {}
      })
  }

  }

    /**
* extends the Object with customData in the correct namespace
* @param {ObjectSettings} oS
* @param {string} Timeperiod
* @param {number} beforeZähler
*/
async _GET_ObjectID_previous(oS, Timeperiod, beforeZähler) {
  if (oS['before_' + Timeperiod + 's'] > 0)
    await this._SET_ExtendChannel(oS, "." + TimePeriodsZahl[Timeperiod] + "_previous" + Timeperiod + "s", Timeperiod + "s Before")
  

  let theID =  "." + TimePeriodsZahl[Timeperiod] + "_previous" + Timeperiod + "s.Before_" + this.pad(beforeZähler, 2) + "_" + Timeperiod
  return theID

}

    /**
* extends the Object with customData in the correct namespace
* @param {ObjectSettings} oS
* @param {string} Timeperiod
* @param {Date} theDate

*/
async _GET_ObjectID_DateInfoName_previous(oS, Timeperiod, theDate, beforeZähler) {

  let theDateInfo = ""
  if (Timeperiod == TimePeriods.Minute) {
    theDate.setMinutes(theDate.getMinutes() - beforeZähler)
    theDateInfo = theDate.toLocaleTimeString()
  } else if (Timeperiod == TimePeriods.Hour) {
    theDate.setHours(theDate.getHours() - beforeZähler)
    theDateInfo = theDate.toLocaleTimeString()

  } else if (Timeperiod == TimePeriods.Day) {
    theDate.setDate(theDate.getDate() - beforeZähler)
    theDateInfo = theDate.toDateString()
  } else if (Timeperiod == TimePeriods.Week) {
    theDate.setDate(theDate.getDate() - 7 * beforeZähler)
    theDateInfo = "KW_" + this._Get_KW(theDate)
  }
  else if (Timeperiod == TimePeriods.Month) {
    theDate.setMonth(theDate.getMonth() - beforeZähler)
    let MonthString = theDate.toLocaleString('en-us', { month: 'long' })
    theDateInfo = this.pad(theDate.getMonth() + 1, 2) + "_" + MonthString
  }
  else if (Timeperiod == TimePeriods.Quarter) {
    theDate.setMonth(theDate.getMonth() - (beforeZähler * 3))

    theDateInfo = "quarter " + this._Get_Quarter(theDate)
  }

  else if (Timeperiod == TimePeriods.Year) {
    theDate.setFullYear(theDate.getFullYear() - beforeZähler)

    theDateInfo = theDate.getFullYear().toString()
  }
  return "Data from " + theDateInfo;
}




    /**
* Creates the needed TreeStructure and returns the Id after alias-name
* @param {ObjectSettings} oS
* @param {string} Timeperiod
* @param {Date} date
*/
async _GET_ObjectID_Detailed(oS, Timeperiod, date) {

  let IZusatz = "." + date.getFullYear()
  await this._SET_ExtendChannel(oS, IZusatz, String(date.getFullYear()))

  if (Timeperiod == TimePeriods.Year ) {
    IZusatz = IZusatz + "."  + TimePeriodsZahl.Year + "_Year_" + date.getFullYear()
    await this._SET_ExtendObject(oS, IZusatz, date.getFullYear() + " Value", 'value.history')
    return IZusatz
  }

  IZusatz = IZusatz + "." + TimePeriodsZahl[Timeperiod] + "_" + Timeperiod + "s"
  await this._SET_ExtendChannel(oS, IZusatz, Timeperiod + "s")
  
  if ( Timeperiod == TimePeriods.Day) {
    let MonthString = date.toLocaleString('en-us', { month: 'long' })
    IZusatz = IZusatz + "." + this.pad(date.getMonth() + 1, 2) + "_" + MonthString
    await this._SET_ExtendChannel(oS, IZusatz, this.pad(date.getMonth() + 1, 2) + "_" + MonthString)
    IZusatz = IZusatz + "." + this.pad(date.getDate(), 2)
    await this._SET_ExtendObject(oS, IZusatz, this.pad(date.getDate(), 2) + ". " + MonthString, "value.history")
  }
  if (Timeperiod == TimePeriods.Month) {
    let MonthString = date.toLocaleString('en-us', { month: 'long' })
    IZusatz = IZusatz + "." + this.pad(date.getMonth() + 1, 2) + "_" + MonthString
    await this._SET_ExtendObject(oS, IZusatz, this.pad(date.getMonth() + 1, 2) + "_" + MonthString, 'value.history')
  }
  if (Timeperiod == TimePeriods.Week) {
    IZusatz = IZusatz + ".KW" + this.pad(this._Get_KW(date), 2)
    await this._SET_ExtendObject(oS, IZusatz, "KW" + this.pad(this._Get_KW(date), 2), "value.history")
  }
  if (Timeperiod == TimePeriods.Quarter ) {
    IZusatz = IZusatz + ".quater_" + this._Get_Quarter(date)
    await this._SET_ExtendObject(oS, IZusatz,'quater_' + this._Get_Quarter(date), "value.history")
  }
  return IZusatz

}

    /**
* returns the current DP
* @param {string} TimePeriod
*/
async _GET_ObjectID_Current(TimePeriod) {
  return  "." + TimePeriodsZahl[TimePeriod] + "_current" + TimePeriod

}




  /**
* extends the Object with customData in the correct namespace
* @param {ObjectSettings} oS
* @param {string} type
* @param {object} value
*/
  async _SET_startValue(oS, type, value) {
    await this.setStateAsync(oS.alias + "._startValues.start_" + TimePeriodsZahl[type] + "_" + type, this._roundto( value), true)
  }
  /**
* extends the Object with customData in the correct namespace
* @param {ObjectSettings} oS
* @param {string} type
* @param {object} currentValue
*/
  async _Get_StartValue(oS, type, currentValue) {
    
    await this._SET_ExtendObject(oS, "._startValues.start_" + TimePeriodsZahl[type] + "_" + type, "start_" + type, "")

    let state = await this.getStateAsync(oS.alias + "._startValues.start_" + TimePeriodsZahl[type] + "_" + type)
    if (!state || state.val == null || state.val == undefined) {
      await this.setStateAsync(oS.alias + "._startValues.start_" + TimePeriodsZahl[type] + "_" + type, currentValue, true)
      state = await this.getStateAsync(oS.alias + "._startValues.start_" + TimePeriodsZahl[type] + "_" + type)
    }
    if (state) {
      return Number(state.val)

    }
    else {
      return 0
    }
  }


  /**
   * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
   * Using this method requires "common.message" property to be set to true in io-package.json
   * @param {ioBroker.Message} obj
   */
  onMessage(obj) {
    if (typeof obj === 'object' && obj.message) {
      if (obj.command === 'send') {
        // e.g. send email or pushover or whatever
        this.log.info('send command');

        // Send response in callback if required
        if (obj.callback) this.sendTo(obj.from, obj.command, 'Message received', obj.callback);
      }
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
