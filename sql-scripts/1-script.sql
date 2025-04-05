-- create database cropco with owner postgres;

\c cropco;


CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


create type public.supplies_unit_of_measure_enum as enum ('GRAMOS', 'MILILITROS');


alter type public.supplies_unit_of_measure_enum owner to postgres;


create type public.payments_method_of_payment_enum as enum ('EFECTIVO', 'TRANSFERENCIA', 'INTERCAMBIO');


alter type public.payments_method_of_payment_enum owner to postgres;


create table public.suppliers (first_name varchar(100) not null, last_name varchar(100) not null, email varchar(100) not null constraint "UQ_66181e465a65c2ddcfa9c00c9c7" unique, cell_phone_number varchar(10) not null, id uuid default uuid_generate_v4() not null constraint "PK_b70ac51766a9e3144f778cfe81e" primary key, company_name varchar(100), address varchar(200) not null, "createdDate" timestamp default now() not null, "updatedDate" timestamp default now() not null, "deletedDate" timestamp);


alter table public.suppliers owner to postgres;


create table public.supplies_shopping (id uuid default uuid_generate_v4() not null constraint "PK_9c61b4c6a9c01eb8f9da9b9d571" primary key, date date not null, total integer not null, "createdDate" timestamp default now() not null, "updatedDate" timestamp default now() not null, "deletedDate" timestamp);


alter table public.supplies_shopping owner to postgres;


create table public.supplies (id uuid default uuid_generate_v4() not null constraint "PK_49c0dc272c9fcf2723bdfd48be1" primary key, name varchar(100) not null constraint "UQ_f5bf463988950dfd84b2e39a3d6" unique, brand varchar(100) not null, unit_of_measure supplies_unit_of_measure_enum not null, observation varchar(500) not null, "createdDate" timestamp default now() not null, "updatedDate" timestamp default now() not null, "deletedDate" timestamp);


alter table public.supplies owner to postgres;


create table public.supplies_shopping_details
    (id uuid default uuid_generate_v4() not null constraint "PK_b35a94b4c27bc0f076a490de5f3" primary key, amount integer not null, total integer not null, "createdDate" timestamp default now() not null, "updatedDate" timestamp default now() not null, "deletedDate" timestamp, "shoppingId" uuid constraint "FK_5ae58c489259e09f8a75a737834" references public.supplies_shopping on delete cascade, "supplyId" uuid constraint "FK_ca514432abdcb210416503a1fea" references public.supplies on delete cascade, "supplierId" uuid constraint "FK_0c72e382ca3645d9b8c48cd0bc3" references public.suppliers on delete cascade);


alter table public.supplies_shopping_details owner to postgres;


create table public.supplies_stock
    (id uuid default uuid_generate_v4() not null constraint "PK_3c132681c53f4b72e778dea6d08" primary key, amount integer not null, "createdDate" timestamp default now() not null, "updatedDate" timestamp default now() not null, "deletedDate" timestamp, "supplyId" uuid constraint "REL_db7a469c7c2e2b8a14be6fac56" unique constraint "FK_db7a469c7c2e2b8a14be6fac569" references public.supplies on delete cascade);


alter table public.supplies_stock owner to postgres;


create table public.supplies_consumption (id uuid default uuid_generate_v4() not null constraint "PK_53ed249db8111a93b6c17ce956e" primary key, date date not null, "createdDate" timestamp default now() not null, "updatedDate" timestamp default now() not null, "deletedDate" timestamp);


alter table public.supplies_consumption owner to postgres;


create table public.employees (first_name varchar(100) not null, last_name varchar(100) not null, email varchar(100) not null constraint "UQ_765bc1ac8967533a04c74a9f6af" unique, cell_phone_number varchar(10) not null, id uuid default uuid_generate_v4() not null constraint "PK_b9535a98350d5b26e7eb0c26af4" primary key, address varchar(200) not null, "createdDate" timestamp default now() not null, "updatedDate" timestamp default now() not null, "deletedDate" timestamp);


alter table public.employees owner to postgres;


create table public.payments
    (id uuid default uuid_generate_v4() not null constraint "PK_197ab7af18c93fbb0c9b28b4a59" primary key, date date not null, method_of_payment payments_method_of_payment_enum not null, total integer not null, "createdDate" timestamp default now() not null, "updatedDate" timestamp default now() not null, "deletedDate" timestamp, "employeeId" uuid constraint "FK_ac5b1622e8053d1320a5699e5cb" references public.employees on delete cascade);


alter table public.payments owner to postgres;


create table public.crops (id uuid default uuid_generate_v4() not null constraint "PK_098dbeb7c803dc7c08a7f02b805" primary key, name varchar(100) not null constraint "UQ_33e6399d4c7cedd12806d5d4dd7" unique, description text not null, units integer not null, location text not null, date_of_creation date not null, date_of_termination date, "createdDate" timestamp default now() not null, "updatedDate" timestamp default now() not null, "deletedDate" timestamp);


alter table public.crops owner to postgres;


create table public.supplies_consumption_details
    (id uuid default uuid_generate_v4() not null constraint "PK_b80cd457fe02c79f0edab2592c6" primary key, amount integer not null, "createdDate" timestamp default now() not null, "updatedDate" timestamp default now() not null, "deletedDate" timestamp, "consumptionId" uuid constraint "FK_159aed32f48fd7398991e162a16" references public.supplies_consumption on delete cascade, "supplyId" uuid constraint "FK_edf7909b5bb29f98074b3785fb4" references public.supplies on delete cascade, "cropId" uuid constraint "FK_e28e3523634651ef4d515bbc629" references public.crops on delete cascade);


alter table public.supplies_consumption_details owner to postgres;


create table public.works
    (id uuid default uuid_generate_v4() not null constraint "PK_a9ffbf516ba6e52604b29e5cce0" primary key, date date not null, description text not null, total integer not null, "createdDate" timestamp default now() not null, "updatedDate" timestamp default now() not null, "deletedDate" timestamp, "cropId" uuid constraint "FK_78401ea62aa980a97bf7c0db11f" references public.crops on delete cascade);


alter table public.works owner to postgres;


create table public.works_detail
    (id uuid default uuid_generate_v4() not null constraint "PK_9bb16639b178373e2e42e6b5d19" primary key, value_pay integer not null, payment_is_pending boolean default true not null, "createdDate" timestamp default now() not null, "updatedDate" timestamp default now() not null, "deletedDate" timestamp, "employeeId" uuid constraint "FK_9260731126a162199e9bc5476d7" references public.employees on delete cascade, "workId" uuid constraint "FK_6baff18d446d6577f196722421c" references public.works on update cascade on delete cascade);


alter table public.works_detail owner to postgres;


create table public.payments_work
    (id uuid default uuid_generate_v4() not null constraint "PK_3e682eac14972e35cf4bdbe5d55" primary key, "paymentId" uuid constraint "FK_eb8d305cdd9a0f949f0eee4f342" references public.payments on delete cascade, "worksDetailId" uuid constraint "REL_10575fc7b97a0f5cacd618fd20" unique constraint "FK_10575fc7b97a0f5cacd618fd202" references public.works_detail on delete cascade);


alter table public.payments_work owner to postgres;


create table public.harvests
    (id uuid default uuid_generate_v4() not null constraint "PK_fb748ae28bc0000875b1949a0a6" primary key, date date not null, total integer not null, value_pay integer not null, observation varchar(500) not null, "createdDate" timestamp default now() not null, "updatedDate" timestamp default now() not null, "deletedDate" timestamp, "cropId" uuid constraint "FK_e849e688de0a0119e0cff46234d" references public.crops on delete cascade);


alter table public.harvests owner to postgres;


create table public.harvests_detail
    (id uuid default uuid_generate_v4() not null constraint "PK_8ad911ceec27e7835c2c8f8fd0d" primary key, total integer not null, value_pay integer not null, payment_is_pending boolean default true not null, "createdDate" timestamp default now() not null, "updatedDate" timestamp default now() not null, "deletedDate" timestamp, "harvestId" uuid constraint "FK_409a9ef948a14a4d0c63f3b81c6" references public.harvests on delete cascade, "employeeId" uuid constraint "FK_79b753e96c822ecb18c8be79472" references public.employees on delete cascade);


alter table public.harvests_detail owner to postgres;


create table public.payments_harvest
    (id uuid default uuid_generate_v4() not null constraint "PK_4d134ed32e3ec5ff6cf025f4956" primary key, "paymentId" uuid constraint "FK_ff43a5a43b0a7bc3685b847e309" references public.payments on delete cascade, "harvestsDetailId" uuid constraint "REL_6b279b60f9e0129649b27af158" unique constraint "FK_6b279b60f9e0129649b27af158c" references public.harvests_detail on delete cascade);


alter table public.payments_harvest owner to postgres;


create table public.harvests_processed
    (id uuid default uuid_generate_v4() not null constraint "PK_f41632e6611c60d5d6703b981bd" primary key, date date not null, total integer not null, "createdDate" timestamp default now() not null, "updatedDate" timestamp default now() not null, "deletedDate" timestamp, "cropId" uuid constraint "FK_a3bee87a0e3cccb4abf1bef2c90" references public.crops on delete cascade, "harvestId" uuid constraint "FK_6c87f6008079ac8545d2629b47b" references public.harvests on delete cascade);


alter table public.harvests_processed owner to postgres;


create table public.harvests_stock
    (id uuid default uuid_generate_v4() not null constraint "PK_9b2dbb20aed8ddba2d34e89c6fa" primary key, total integer not null, "createdDate" timestamp default now() not null, "updatedDate" timestamp default now() not null, "deletedDate" timestamp, "cropId" uuid constraint "REL_ce32e2cd42af8542728c3a8f2a" unique constraint "FK_ce32e2cd42af8542728c3a8f2a7" references public.crops on delete cascade);


alter table public.harvests_stock owner to postgres;


create table public.sales (id uuid default uuid_generate_v4() not null constraint "PK_4f0bc990ae81dba46da680895ea" primary key, date date not null, quantity integer not null, total integer not null);


alter table public.sales owner to postgres;


create table public.clients (first_name varchar(100) not null, last_name varchar(100) not null, email varchar(100) not null constraint "UQ_b48860677afe62cd96e12659482" unique, cell_phone_number varchar(10) not null, id uuid default uuid_generate_v4() not null constraint "PK_f1ab7cf3a5714dbc6bb4e1c28a4" primary key, address varchar(200) not null, "createdDate" timestamp default now() not null, "updatedDate" timestamp default now() not null, "deletedDate" timestamp);


alter table public.clients owner to postgres;


create table public.sales_detail
    (id uuid default uuid_generate_v4() not null constraint "PK_b683a33c50fe3ce4d87669f6e4d" primary key, quantity integer not null, total integer not null, is_receivable boolean default false not null, "createdDate" timestamp default now() not null, "updatedDate" timestamp default now() not null, "deletedDate" timestamp, "saleId" uuid constraint "FK_44a9354f3d5d64611d587e9d3ec" references public.sales on update cascade on delete cascade, "cropId" uuid constraint "FK_133bd915a31e5baa9797e679663" references public.crops on delete cascade, "clientId" uuid constraint "FK_787419a0f51ace9b0170166f10d" references public.clients on delete cascade);


alter table public.sales_detail owner to postgres;


create table public.modules (id uuid default uuid_generate_v4() not null constraint "PK_7dbefd488bd96c5bf31f0ce0c95" primary key, name varchar(100) not null constraint "UQ_8cd1abde4b70e59644c98668c06" unique, label varchar(100) not null constraint "UQ_50143b1898ec3405162de7db89b" unique);


alter table public.modules owner to postgres;


create table public.roles (id uuid default uuid_generate_v4() not null constraint "PK_c1433d71a4838793a49dcad46ab" primary key, name varchar(100) not null);


alter table public.roles owner to postgres;


create table public.module_actions
    (id uuid default uuid_generate_v4() not null constraint "PK_d9ee7a3907ed3b4836d11c2359a" primary key, name varchar default 'none'::character varying not null constraint "UQ_e1b413bdd6bfefafd6f7af4bd05" unique, description varchar not null, path_endpoint varchar default 'http://localhost'::character varying not null, is_visible boolean default false not null, "moduleId" uuid constraint "FK_7f84769243b71b6455da85750a3" references public.modules on delete cascade);


alter table public.module_actions owner to postgres;


create table public.role_actions (id uuid default uuid_generate_v4() not null constraint "PK_5ee58f1e3c6236c691f190e0781" primary key, "rolId" uuid constraint "FK_9d13c4a6a201310bd9f823cd1a7" references public.roles, "actionId" uuid constraint "FK_4a9b2fe5fdcafd96bbf51e61d24" references public.module_actions);


alter table public.role_actions owner to postgres;


create table public.users (first_name varchar(100) not null, last_name varchar(100) not null, email varchar(100) not null constraint "UQ_97672ac88f789774dd47f7c8be3" unique, cell_phone_number varchar(10) not null, id uuid default uuid_generate_v4() not null constraint "PK_a3ffb1c0c8416b9fc6f907b7433" primary key, password varchar(100) not null, roles text[] default '{user}'::text[] not null, is_active boolean default false not null, "createdDate" timestamp default now() not null, "updatedDate" timestamp default now() not null, "deletedDate" timestamp);


alter table public.users owner to postgres;


create table public.user_actions
    (id uuid default uuid_generate_v4() not null constraint "PK_3c8a683381b553ee59ce5b7b13a" primary key, "createdDate" timestamp default now() not null, "updatedDate" timestamp default now() not null, "deletedDate" timestamp, "userId" uuid constraint "FK_e65a8053e5b02e0b89947b6bac9" references public.users on delete cascade, "actionId" uuid constraint "FK_5c7cd5428cfdf75aa7945bc62b8" references public.module_actions on delete cascade);


alter table public.user_actions owner to postgres;

