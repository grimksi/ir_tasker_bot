const TelegramBot = require('node-telegram-bot-api')
const { Query } = require('pg')
const { json } = require('stream/consumers')
const { getChatId } = require('./helpers')
const token = '5703563310:AAE0tmQJfBQ1zFJxlRy_u9fpo65Dne9dhrM'

//const debug = require('./helpers')
//const helpers = require('./helpers')

const sequelize = require('./db')
const personalModel = require('./models').personal
const personal = require('./models').personal
const reports = require('./models').reports
const { Op } = require('sequelize')
const cron = require('node-cron')
const { query } = require('./db')
const webAppUrl = 'https://ya.ru'
const {format} = require('date-fns')

console.log('bot has been started . . .')
const bot = new TelegramBot(token, { polling: true})
bot.on("polling_error", console.log);


//Тут я кароче че-то делаю доброе утро

const morning = {
    reply_markup: {
        inline_keyboard: [
            [{
            text: 'Ввести план на день',
            callback_data: 'Ввести план на день'
            },{
            text: 'Сегодня не работаю',
            callback_data: 'Сегодня не работаю'
            }]
        ]
    }
}

const evening = {
    reply_markup: {
        inline_keyboard: [
            [{
                text: 'Ввести факт',
                callback_data: 'Ввести факт'
            },{
                text: 'Сегодня не работал',
                callback_data: 'Сегодня не работал'
            }]
        ]
    }
}

const timess = {
    reply_markup: {               
        inline_keyboard: [
            [{
                text: 'Полный рабочий день',
                callback_data: 'Полный рабочий день'
            },{
                text: 'Ввести часы работы',
                callback_data: 'Ввести часы работы'
            }]
        ]
    }
}
//.........................

//Создание отчетов
cron.schedule('0 9 * * 1-5', () =>{  
    personal.findAll({where:{active: "Y", chat_id: {[Op.not]: null}}, raw: true })
    .then(user=>{
    user.forEach(item =>
        reports.create({
            date: format(new Date(),'yyyy-MM-dd'),
            chat_id: item.chat_id,
            worked: "N"
          }).then(res=>{
            console.log(res);
          }).catch(err=>console.log(err))
    )
    }).catch(err=>console.log(err));
})

//План
cron.schedule('0 10 * * 1-5', () =>{  
    reports.findAll({where:{tasks: null, date: format(new Date(),'yyyy-MM-dd')}, raw: true })
    .then(user=>{
        user.forEach(item => bot.sendMessage(item.chat_id, 'Доброе утро! Что на сегодня запланировано?', morning));
    }).catch(err=>console.log(err));
})

//Факт
cron.schedule('0 19 * * 1-5', () =>{            
    reports.findAll({where:{fact: null, date: format(new Date(),'yyyy-MM-dd')}, raw: true })
    .then(user=>{
        user.forEach(item => bot.sendMessage(item.chat_id, 'Готов отчитаться за день?', evening));
    }).catch(err=>console.log(err));
})

//Реакция на клавы
bot.on('callback_query', (query) =>{
    if (query.data === 'Ввести план на день'){       
        bot.sendMessage(query.message.chat.id, 'Жду',)           
        bot.once('message', (msg)=>{            
            sequelize.query("UPDATE reports SET tasks = $2 WHERE chat_id= $1 AND date = $3", {
                bind:[msg.chat.id,msg.text,format(new Date(),'yyyy-MM-dd')],
                model: reports,   
                mapToModel: true,
                type: Op.SELECT,
            });
            bot.sendMessage(query.message.chat.id, 'ok',);
        })
    } 
    else if (query.data === 'Сегодня не работаю'){
        bot.sendMessage(query.message.chat.id, 'Введите причину',) 
        bot.once('message', (msg) =>{
            sequelize.query("UPDATE reports SET fact = $2 WHERE chat_id= $1 AND date = $3", {
                bind:[msg.chat.id,msg.text,format(new Date(),'yyyy-MM-dd')],
                model: reports,
                mapToModel: true,
                type: Op.SELECT,
            });
            bot.sendMessage(query.message.chat.id, 'ok',);
        })
    }
    else if (query.data === 'Ввести факт'){       
        bot.sendMessage(query.message.chat.id, 'Жду',)           
        bot.once('message', (msg)=>{                      
            this.facts = msg.text; 
            bot.sendMessage(query.message.chat.id, 'У тебы был полный рабочий день?', timess);
        })                              
    }
    else if (query.data === 'Сегодня не работал'){
        bot.sendMessage(query.message.chat.id, 'Введите причину',) 
        bot.once('message', (msg) =>{
            sequelize.query("UPDATE reports SET fact = $2 WHERE chat_id= $1 AND date = $3", {
                bind:[msg.chat.id,msg.text,format(new Date(),'yyyy-MM-dd')],
                model: reports,
                mapToModel: true,
                type: Op.SELECT,
            });
            bot.sendMessage(query.message.chat.id, 'ok',);
        })
    }
    else if(query.data === 'Полный рабочий день'){  
        sequelize.query("UPDATE reports SET fact = $2, worked = 'Y', hours = '8' WHERE chat_id = $1 AND date = $3", {
            bind:[query.message.chat.id,this.facts,format(new Date(),'yyyy-MM-dd')],
            model: reports,
            mapToModel: true,
            type: Op.SELECT,
        });
        bot.sendMessage(query.message.chat.id, 'ok',);        
    }
    else if (query.data === 'Ввести часы работы'){
        bot.sendMessage(query.message.chat.id, 'Сколько часов отработал?',);
        (function tratata(facts) {(bot.once('message', (msg)=>{ 
            if (msg.text > 0 && msg.text <9) { 
                sequelize.query("UPDATE reports SET fact = $2, worked = 'Y', hours = $4 WHERE chat_id = $1 AND date = $3", {
                    bind:[query.message.chat.id,facts,format(new Date(),'yyyy-MM-dd'),msg.text],
                    model: reports,
                    mapToModel: true,
                    type: Op.SELECT,
                });
                bot.sendMessage(query.message.chat.id, 'ok',);
            }
            else {
                bot.sendMessage(query.message.chat.id, 'Что ты несешь?',);
                tratata(facts);
                return;
            }
        }))}(this.facts))
    }
    bot.editMessageReplyMarkup({reply_markup: JSON.stringify({keyboard: []})}, {chat_id: query.message.chat.id, message_id: query.message.message_id})
})

bot.onText(/\/plan/, msg => {
    reports.findOne({where:{chat_id: msg.chat.id, date: format(new Date(),'yyyy-MM-dd')}, raw: true })
    .then(user=>{
        if (user.tasks == null && user.fact == null){
            bot.sendMessage(user.chat_id, 'Доброе утро! Что на сегодня запланировано?', morning);
        } else {
            bot.sendMessage(user.chat_id, 'Не понял');
        }
    }).catch(err=>console.log(err));
}) 

bot.onText(/\/fact/, msg => {
    reports.findOne({where:{chat_id: msg.chat.id, date: format(new Date(),'yyyy-MM-dd')}, raw: true })
    .then(user=>{
        if (user.fact == null){
            bot.sendMessage(user.chat_id, 'Готов отчитаться за день?', evening);
        } else {
            bot.sendMessage(user.chat_id, 'Не понял');
        }
    }).catch(err=>console.log(err));
}) 


//Тут я кароче закончил что-то делать, спокойной ночи


bot.onText(/\/start/, msg => {
   
    const reqPhone = {
        reply_markup: {
            
            keyboard: [
                [{
                text: "Отправить мой номер",
                request_contact: true,
                remove_keyboard: true,
                
                }],
                ["Отмена"]
            ]
        }
    }  
      
    try{
        sequelize.authenticate( 
        sequelize.sync(),
        console.log('db  in')
        )

    } catch (e) { console.log('db  errors')}

    function check_id(){
        
        const isIdUnique = chat_id =>
            personalModel.findOne({ where: { chat_id} , attributes: ['chat_id'] })
            .then(token => token !== null)
            .then(isUnique => isUnique);

        const isIdUniqueAccess = access_level =>
            personalModel.findOne({ where: { [Op.and]: [{access_level},{chat_id:msg.chat.id}] } , attributes: ['chat_id'] })  
            .then(isIdUniqueAccess => isIdUniqueAccess);
    
        isIdUnique(msg.chat.id).then(isUnique => {
            if (isUnique) {
                bot.sendMessage(getChatId(msg), 'Вы можете начать работать с ботом')

                isIdUniqueAccess(1).then(isIdUniqueAccess => {
                    if (isIdUniqueAccess) {
                        bot.sendMessage(getChatId(msg), '1')
                    }
                    else{
                        bot.sendMessage(getChatId(msg), '!=1')
                        
                    }
                })
            }
            else{
                bot.sendMessage(getChatId(msg), 'Вас нет в списке, отправьте номер ', reqPhone)
                
                bot.once('contact', msg=>{
                    const telUser = msg.contact.phone_number.replace('+','')
                    
                    function check_num(){
    
                        const isIdUnique = number_phone =>
                            personalModel.findOne({ where: { number_phone} , attributes: ['number_phone'] })
                            .then(token => token !== null)
                            .then(isUnique => isUnique);
                    
                        isIdUnique(telUser).then(isUnique => {
                            if (isUnique) {
                                bot.sendMessage(getChatId(msg), 'Вы можете начать работать с ботом')
                                sequelize.query("UPDATE personals SET chat_id = $2 WHERE number_phone = $1", {
                                    bind:[telUser,msg.chat.id],
                                    model: personal,   
                                    mapToModel: true,
                                    type: Op.SELECT,
                                })
                                
                            }
                            else{
                                bot.sendMessage(getChatId(msg), 'Вас нет в списке, обратьтесь к администратору')
                            }
                        })
                    }
                    check_num()                   
                })
            }
        })
    }
    check_id()
})
 
    bot.onText(/\/reports/, msg => {
        function rep(){       
            const isIdUnique = chat_id =>
                personalModel.findOne({ where: { chat_id} , attributes: ['chat_id'] })
                .then(token => token !== null)
                .then(isUnique => isUnique);

            const isIdUniqueAccess = access_level =>
                personalModel.findOne({ where: { [Op.and]: [{access_level},{chat_id:msg.chat.id}] } , attributes: ['chat_id'] })  
                .then(isIdUniqueAccess => isIdUniqueAccess);
        
            isIdUnique(msg.chat.id).then(isUnique => {
                if (isUnique) {
                    isIdUniqueAccess(1).then(isIdUniqueAccess => {
                        if (isIdUniqueAccess) {
                            bot.sendMessage(getChatId(msg), 'Недостаточно прав')
                        }
                        else{
                            bot.sendMessage(getChatId(msg), 'Нажмите на кнопку для просмотра отчетов', {
                                reply_markup:{
                                    inline_keyboard:[
                                        [{text: 'Просмотр отчетов', web_app:{url: webAppUrl}}]
                                    ]
                                }
                            })                    
                        }
                    })
                }
                else{
                    bot.sendMessage(getChatId(msg), 'Вас нет в списке, обратьтесь к администратору')
                }
            })
        }
        rep()
        
       
    })   
  
    
    









   
  