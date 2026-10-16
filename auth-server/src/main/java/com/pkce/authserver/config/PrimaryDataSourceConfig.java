package com.pkce.authserver.config;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.transaction.PlatformTransactionManager;

import javax.sql.DataSource;
import java.util.Properties;

/**
 * Makes this server's original single-datasource JPA setup explicit instead of relying on
 * Spring Boot autoconfiguration, which is required once a second DataSource bean
 * (AdminDataSourceConfig, for mindfullAdmin.Admin) exists in the context - Boot's
 * DataSourceAutoConfiguration/JpaBaseConfiguration back off as soon as any DataSource/
 * EntityManagerFactory/TransactionManager bean is defined explicitly, for either one.
 *
 * Behaviour is unchanged from before: same spring.datasource.* properties (mindfullP1),
 * same ddl-auto/dialect/naming-strategy from application.yml, same entity/repository
 * packages that were already being scanned (com.pkce.authserver.entity and
 * com.pkce.authserver.superme.model / .repository).
 */
@Configuration
@EnableJpaRepositories(
        basePackages = "com.pkce.authserver.repository",
        entityManagerFactoryRef = "entityManagerFactory",
        transactionManagerRef = "transactionManager"
)
public class PrimaryDataSourceConfig {

    @Primary
    @Bean(name = "dataSource")
    @ConfigurationProperties(prefix = "spring.datasource")
    public DataSource dataSource() {
        return new HikariDataSource();
    }

    @Primary
    @Bean(name = "entityManagerFactory")
    public LocalContainerEntityManagerFactoryBean entityManagerFactory(
            @Qualifier("dataSource") DataSource dataSource) {

        LocalContainerEntityManagerFactoryBean em = new LocalContainerEntityManagerFactoryBean();
        em.setDataSource(dataSource);
        em.setPackagesToScan("com.pkce.authserver.entity", "com.pkce.authserver.superme.model");
        em.setJpaVendorAdapter(new HibernateJpaVendorAdapter());

        Properties props = new Properties();
        // Matches application.yml's spring.jpa.* for this datasource exactly: validate only,
        // never let this server alter mindfullP1's schema.
        props.put("hibernate.hbm2ddl.auto", "validate");
        props.put("hibernate.dialect", "org.hibernate.dialect.MySQLDialect");
        props.put("hibernate.physical_naming_strategy",
                "org.hibernate.boot.model.naming.PhysicalNamingStrategyStandardImpl");

        em.setPersistenceUnitName("primary");
        em.setJpaProperties(props);
        return em;
    }

    @Primary
    @Bean(name = "transactionManager")
    public PlatformTransactionManager transactionManager(
            @Qualifier("entityManagerFactory") LocalContainerEntityManagerFactoryBean emf) {

        return new JpaTransactionManager(emf.getObject());
    }
}
