const data = {
  devices: [
    {
      id: "F972B82BA56A70CC579945773B6866FB",
      name: "Посудомоечная машина",
      power: 950,
      duration: 3,
      mode: "night"
    },
    {
      id: "C515D887EDBBE669B2FDAC62F571E9E9",
      name: "Духовка",
      power: 2000,
      duration: 2,
      mode: "day"
    },
    {
      id: "02DDD23A85DADDD71198305330CC386D",
      name: "Холодильник",
      power: 50,
      duration: 24
    },
    {
      id: "1E6276CC231716FE8EE8BC908486D41E",
      name: "Термостат",
      power: 50,
      duration: 24
    },
    {
      id: "7D9DC84AD110500D284B33C82FE6E85E",
      name: "Кондиционер",
      power: 850,
      duration: 1
    }
  ],
  rates: [
    { from: 7, to: 10, value: 6.46 },
    { from: 10, to: 17, value: 5.38 },
    { from: 17, to: 21, value: 6.46 },
    { from: 21, to: 23, value: 5.38 },
    { from: 23, to: 7, value: 1.79 }
  ],
  maxPower: 2100
};

const startHour = 0;
const endHour = 23;
const midnight = endHour + 1;
const night = "night";
const day = "day";
const startDay = 7;
const endDay = 21;

//Вычисляем максимальное потребление энергии за сутки каждого прибора
data.devices.map(item => {
  item.maxPower = item.power * item.duration;
});

//устройства отсортировать по стоимости затраченной энергии power * duration
const filteredDevice = data.devices.slice().sort((a, b) => {
  return a.maxPower - b.maxPower;
});

//проверить и скорректировать временные интервалы тарифов: при наличии интервала
data.rates.map(item => {
  if (item.from > item.to) {
    let newItem = {};
    for (var key in item) {
      newItem[key] = item[key];
    }
    item.to = midnight;
    newItem.from = startHour;
    data.rates.push(newItem);
  }
});

//функция возвращает параметры rate для заданного часа
const getRates = h => {
  for (let i = 0; i < data.rates.length; i++) {
    const rate = data.rates[i];
    if (h >= rate.from && h < rate.to) return rate;
  }
};

//функция возвращает mode для заданного часа
const getHourMode = h => {
  if ((h >= startHour && h < startDay) || (h >= endDay && h < midnight))
    return night;
  if (h >= startDay && h < endDay) return day;
};

//создать объект расписание с параметрами index[0-23]: [price: value, limitPower: value]
let shedule = {};
for (let i = startHour; i <= endHour; i++) {
  shedule[i] = { price: getRates(i).value, limitPower: data.maxPower };
}

//создать результирующий объект
const output = {
  "shedule": {},
  "consumedEnergy": {
    "value": null,
    "devices": {}
  }
};

const initShedule = (start, end) => {
  for (let i = start; i <= end; i++) {
    output.shedule[i] = [];
  }
};

initShedule(0, 23);

//функция добавляет устройство в выходной набор данных:
//делает запись в нужных интервалах (с start по n) и вычисляет контрольные суммы (consumedEnergy)
const addItemToShedule = (start, end, item) => {
  let value = 0;
  for (let i = start; i <= end; i++) {
    output.shedule[i].push(item.id);
    value += shedule[i].price;
    shedule[i].limitPower -= item.power;
  }
  value = parseFloat(((value / 1000) * item.power).toFixed(3));
  output.consumedEnergy.value += value;
  output.consumedEnergy.devices[item.id] = value;
};

//записать устройств с дительностью работы 24 часа
filteredDevice.map(item => {
  if (item.duration === midnight) {
    addItemToShedule(startHour, endHour, item);
  }
});

//рассчитываем максимально возможные затраты в день
let maxPrice = 0;
for (let i = 0; i < Object.keys(shedule).length; i++) {
  maxPrice += shedule[i].price * data.maxPower;
}

//функция возвращает начало (час) оптимального интервала
const searchOptimalInterval = item => {
  let intervalPrice = startInterval = 0;
  let minPrice = maxPrice;

  for (let i = startHour; i <= endHour; i++) {
    intervalPrice = getIntervalPrice(item, i);
    if (intervalPrice >= 0 && intervalPrice < minPrice) {
      minPrice = intervalPrice;
      startInterval = i;
    }
  }

  return startInterval;
};

const getIntervalPrice = (item, startHour) => {
  let sumPrice = 0;
  const endHour = startHour + item.duration ;
  for(let i = startHour; i < endHour; i++) {
    if (!isValidHour(i, item)) return -1;
    sumPrice += shedule[i].price;
  }
  return sumPrice;
}

const isValidHour = (h, item) => {  
  return h < midnight && shedule[h].limitPower >= item.power && ( !item.mode || getHourMode(h) === item.mode) ;
}


filteredDevice.filter(item => item.duration != midnight).map(item => {
  const start = searchOptimalInterval(item);
  addItemToShedule(start, start + item.duration - 1, item);
});

console.log(output);