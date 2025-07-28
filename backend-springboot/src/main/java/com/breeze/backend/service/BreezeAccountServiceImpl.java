package com.breeze.backend.service;

import com.breeze.backend.dto.BreezeAccountDto;
import com.breeze.backend.model.BreezeAccount;
import com.breeze.backend.model.User;
import com.breeze.backend.repository.BreezeAccountRepository;
import com.breeze.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class BreezeAccountServiceImpl implements BreezeAccountService {

    @Autowired
    private BreezeAccountRepository breezeAccountRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TaskProducer taskProducer;

    @Override
    public List<BreezeAccountDto> getBreezeAccounts() {
        UserDetails userDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String email = userDetails.getUsername();
        User user = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));
        return breezeAccountRepository.findByUserId(user.getId()).stream().map(this::convertToDto).collect(Collectors.toList());
    }

    @Override
    public BreezeAccountDto createBreezeAccount(BreezeAccountDto breezeAccountDto) {
        UserDetails userDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String email = userDetails.getUsername();
        User user = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));
        BreezeAccount breezeAccount = convertToEntity(breezeAccountDto);
        breezeAccount.setUser(user);
        return convertToDto(breezeAccountRepository.save(breezeAccount));
    }

    @Override
    public BreezeAccountDto updateBreezeAccount(Long id, BreezeAccountDto breezeAccountDto) {
        BreezeAccount breezeAccount = breezeAccountRepository.findById(id).orElseThrow(() -> new RuntimeException("Breeze account not found"));
        breezeAccount.setName(breezeAccountDto.getName());
        breezeAccount.setApiKey(breezeAccountDto.getApiKey());
        breezeAccount.setApiSecret(breezeAccountDto.getApiSecret());
        breezeAccount.setSessionToken(breezeAccountDto.getSessionToken());
        breezeAccount.setActive(breezeAccountDto.isActive());
        BreezeAccount updatedAccount = breezeAccountRepository.save(breezeAccount);

        // Assuming credentials_updated logic is handled before calling this method
        // For now, always send a message to trigger websocket refresh
        taskProducer.sendWebsocketTask("Refresh session for user: " + breezeAccount.getUser().getId());

        return convertToDto(updatedAccount);
    }

    private BreezeAccountDto convertToDto(BreezeAccount breezeAccount) {
        BreezeAccountDto breezeAccountDto = new BreezeAccountDto();
        breezeAccountDto.setId(breezeAccount.getId());
        breezeAccountDto.setUserId(breezeAccount.getUser().getId());
        breezeAccountDto.setName(breezeAccount.getName());
        breezeAccountDto.setApiKey(breezeAccount.getApiKey());
        breezeAccountDto.setApiSecret(breezeAccount.getApiSecret());
        breezeAccountDto.setSessionToken(breezeAccount.getSessionToken());
        breezeAccountDto.setActive(breezeAccount.isActive());
        return breezeAccountDto;
    }

    private BreezeAccount convertToEntity(BreezeAccountDto breezeAccountDto) {
        BreezeAccount breezeAccount = new BreezeAccount();
        breezeAccount.setName(breezeAccountDto.getName());
        breezeAccount.setApiKey(breezeAccountDto.getApiKey());
        breezeAccount.setApiSecret(breezeAccountDto.getApiSecret());
        breezeAccount.setSessionToken(breezeAccountDto.getSessionToken());
        breezeAccount.setActive(breezeAccountDto.isActive());
        return breezeAccount;
    }
}