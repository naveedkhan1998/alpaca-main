package com.breeze.backend.service;

import com.breeze.backend.config.RabbitMQConfig;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class TaskProducer {

    @Autowired
    private RabbitTemplate rabbitTemplate;

    public void sendWebsocketTask(String message) {
        rabbitTemplate.convertAndSend(RabbitMQConfig.WEBSOCKET_QUEUE, message);
    }

    public void sendCandleTask(String message) {
        rabbitTemplate.convertAndSend(RabbitMQConfig.CANDLE_QUEUE, message);
    }
}
