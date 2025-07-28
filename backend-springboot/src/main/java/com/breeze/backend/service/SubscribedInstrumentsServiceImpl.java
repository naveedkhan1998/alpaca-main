package com.breeze.backend.service;

import com.breeze.backend.dto.SubscribedInstrumentDto;
import com.breeze.backend.model.Instrument;
import com.breeze.backend.model.PercentageInstrument;
import com.breeze.backend.model.SubscribedInstruments;
import com.breeze.backend.repository.InstrumentRepository;
import com.breeze.backend.repository.PercentageInstrumentRepository;
import com.breeze.backend.repository.SubscribedInstrumentsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class SubscribedInstrumentsServiceImpl implements SubscribedInstrumentsService {

    @Autowired
    private SubscribedInstrumentsRepository subscribedInstrumentsRepository;

    @Autowired
    private InstrumentRepository instrumentRepository;

    @Autowired
    private PercentageInstrumentRepository percentageInstrumentRepository;

    @Autowired
    private TaskProducer taskProducer;

    @Override
    public List<SubscribedInstrumentDto> getSubscribedInstruments() {
        return subscribedInstrumentsRepository.findAll().stream().map(this::convertToDto).collect(Collectors.toList());
    }

    @Override
    public SubscribedInstrumentDto subscribeInstrument(Long instrumentId, int duration) {
        Instrument instrument = instrumentRepository.findById(instrumentId).orElseThrow(() -> new RuntimeException("Instrument not found"));

        SubscribedInstruments subscribedInstruments = new SubscribedInstruments();
        subscribedInstruments.setExchange(instrument.getExchange());
        subscribedInstruments.setStockToken(instrument.getStockToken());
        subscribedInstruments.setToken(instrument.getToken());
        subscribedInstruments.setInstrument(instrument.getInstrument());
        subscribedInstruments.setShortName(instrument.getShortName());
        subscribedInstruments.setSeries(instrument.getSeries());
        subscribedInstruments.setCompanyName(instrument.getCompanyName());
        subscribedInstruments.setExpiry(instrument.getExpiry());
        subscribedInstruments.setStrikePrice(instrument.getStrikePrice());
        subscribedInstruments.setOptionType(instrument.getOptionType());
        subscribedInstruments.setExchangeCode(instrument.getExchangeCode());

        SubscribedInstruments savedSubscribedInstruments = subscribedInstrumentsRepository.save(subscribedInstruments);

        PercentageInstrument percentageInstrument = new PercentageInstrument();
        percentageInstrument.setInstrument(savedSubscribedInstruments);
        percentageInstrumentRepository.save(percentageInstrument);

        // Send message to RabbitMQ to load instrument candles
        taskProducer.sendCandleTask("Load candles for instrument: " + savedSubscribedInstruments.getId() + ", duration: " + duration);

        // Send message to RabbitMQ to subscribe to websocket
        taskProducer.sendWebsocketTask("Subscribe to websocket for instrument: " + savedSubscribedInstruments.getStockToken());

        return convertToDto(savedSubscribedInstruments);
    }

    @Override
    public void unsubscribeInstrument(Long id) {
        SubscribedInstruments instrument = subscribedInstrumentsRepository.findById(id).orElseThrow(() -> new RuntimeException("Instrument not found"));
        subscribedInstrumentsRepository.deleteById(id);
        // Send message to RabbitMQ to unsubscribe from websocket
        taskProducer.sendWebsocketTask("Unsubscribe from websocket for instrument: " + instrument.getStockToken());
    }

    private SubscribedInstrumentDto convertToDto(SubscribedInstruments instrument) {
        SubscribedInstrumentDto dto = new SubscribedInstrumentDto();
        dto.setId(instrument.getId());
        dto.setExchangeId(instrument.getExchange().getId());
        dto.setStockToken(instrument.getStockToken());
        dto.setToken(instrument.getToken());
        dto.setInstrument(instrument.getInstrument());
        dto.setShortName(instrument.getShortName());
        dto.setSeries(instrument.getSeries());
        dto.setCompanyName(instrument.getCompanyName());
        dto.setExpiry(instrument.getExpiry());
        dto.setStrikePrice(instrument.getStrikePrice());
        dto.setOptionType(instrument.getOptionType());
        dto.setExchangeCode(instrument.getExchangeCode());
        percentageInstrumentRepository.findByInstrument(instrument).ifPresent(pi -> {
            dto.setPercentage(pi.getPercentage());
            dto.setLoading(pi.isLoading());
        });
        return dto;
    }
}
